export interface PatreonAccount {
    data: {
        id: string;
        attributes: {
            pledge_sum: number;
            patron_count: number;
            paid_member_count: number;
        };
    }[];
    included: Array<
        {
            type: unknown;
        } | {
            type: 'reward';
            id: string;
            attributes: {
                amount_cents: number | unknown;
            };
        }
    >;
}

export interface PatreonPledgesReward {
    type: 'reward';
    id: string;
    attributes: {
        amount_cents: number | unknown;
    };
}

export interface PatreonPledgesUser {
    type: 'user';
    id: string;
    attributes: {
        full_name: string;
    };
}

export interface PatreonPledges {
    data: Array<{
        type: 'pledge';
        id: string;
        relationships: {
            reward?: {
                data: {
                    id: string;
                    type: 'reward';
                };
            };
            patron?: {
                data: {
                    id: string;
                    type: 'user';
                };
            };
        };
    }>;
    included: Array<
        PatreonPledgesReward | PatreonPledgesUser
    >;
    links?: {
        next?: string;
    };
}

export interface PatreonPledge {
    name: string;
    levelId: string;
}

export interface PatreonInfo {
    all: number;
    paid: number;
    highlighted: PatreonPledge[];
    budget: number;
}
