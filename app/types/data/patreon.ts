export interface PatreonPledge {
    name: string;
    levelId: string;
}

export interface PatreonInfo {
    all: number;
    paid: number;
    highlighted: PatreonPledge[];
}
