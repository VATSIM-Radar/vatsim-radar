import { initInfluxDB } from '~/utils/backend/influx';

export default defineNitroPlugin(app => {
    try {
        initInfluxDB();
    }
    catch (e) {
        console.error(e);
    }
});
