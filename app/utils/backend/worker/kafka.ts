import { Kafka } from 'kafkajs';
import {
    kafkaAddClient,
    kafkaRemoveClient,
    kafkaRemovePlan,
    kafkaUpdateController,
    kafkaUpdatePilot,
    kafkaUpdatePlan,
} from '~/utils/backend/vatsim/kafka';

export async function initKafka() {
    try {
        if (!process.env.VATSIM_KAFKA_BROKER) return;

        const kafka = new Kafka({
            brokers: [process.env.VATSIM_KAFKA_BROKER!],
            connectionTimeout: 10000,
            authenticationTimeout: 10000,
            sasl: {
                mechanism: 'scram-sha-256',
                username: process.env.VATSIM_KAFKA_USER!,
                password: process.env.VATSIM_KAFKA_PASSWORD!,
            },
        });

        const consumer = kafka.consumer({ groupId: process.env.VATSIM_KAFKA_GROUP! });
        await consumer.connect();

        const topics = [
            'ADDCLIENT',
            'RMCLIENT',
            'AD',
            'PD',
            'PLAN',
            'DELPLAN',
        ];

        const topicsInfo: Record<string, { partition: number; offset: string }> = {};

        await consumer.subscribe({
            topics,
            fromBeginning: false,
        });

        const admin = kafka.admin();

        await admin.connect();

        await Promise.all(topics.map(async topic => {
            const offsets = await admin.fetchTopicOffsets(topic);
            const lastOffset = offsets[offsets.length - 1];
            if (lastOffset) {
                topicsInfo[topic] = {
                    partition: lastOffset.partition,
                    offset: lastOffset.offset,
                };
            }
        }));

        await admin.disconnect();

        consumer.run({
            autoCommitInterval: 5000,
            partitionsConsumedConcurrently: 1,
            eachMessage: async ({
                topic,
                partition,
                message,
            }) => {
                if (!message.value) return;

                const json = JSON.parse(message.value.toString());

                const timestamp = new Date(message.timestamp);
                const curDate = Date.now();

                // Don't accept messages older than 10s
                if (timestamp.getTime() + (1000 * 10) < curDate) return;

                if (topic === 'ADDCLIENT') return kafkaAddClient(json);
                if (topic === 'RMCLIENT') return kafkaRemoveClient(json);
                if (topic === 'AD') return kafkaUpdateController(json);
                if (topic === 'PD') return kafkaUpdatePilot(json);
                if (topic === 'PLAN') return kafkaUpdatePlan(json);
                if (topic === 'DELPLAN') return kafkaRemovePlan(json);
            },
        });
        for (const key in topicsInfo) {
            consumer.seek({
                topic: key,
                partition: topicsInfo[key].partition,
                offset: topicsInfo[key].offset,
            });
        }
    }
    catch (e) {
        console.error(e);
    }
}
