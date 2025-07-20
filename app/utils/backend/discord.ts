import { DiscordStrategy } from '@prisma/client';

export function getDiscordName(foundStrategy: DiscordStrategy, vatsimId: string, fullName: string) {
    switch (foundStrategy) {
        case DiscordStrategy.CID_ONLY:
            return `|-${ vatsimId }-|`;
        case DiscordStrategy.FIRST_NAME:
            return `${ fullName.split(' ')[0] } ${ vatsimId }`;
        case DiscordStrategy.FULL_NAME:
        default:
            return `${ fullName } ${ vatsimId }`;
    }
}
