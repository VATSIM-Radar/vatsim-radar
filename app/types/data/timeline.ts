export interface TimelineHeader {
    name: string;
    custom?: string | (() => VNode);
}

export interface TimelineIdentifier {
    name: string;
    collapsable?: boolean;
    collapsed?: boolean;
    invisible?: boolean;
    custom?: string | (() => VNode);
}

export interface TimelineEntry {
    start: Date;
    end: Date;
    title: string;
    id: number;
    collapsed?: boolean;
    details?: TimelineDetails;
    color?: string;
}

export interface TimelineDetails {
    details: string;
    tooltip?: boolean;
    custom?: string | (() => VNode);
}
