interface DuplicatingSettingV2 {
    // NCT, SFO, etc
    prefixes?: string[];

    // CTR, TMU, etc
    suffixes?: string[];

    // Used alongside prefixes/suffixes
    matchRegex?: RegExp;

    authorCid: number;

    description: string;

    /**
     * @description ATIS line: callsign
     */
    mapping: Record<string, string>;
}

export const duplicatingSettings = [
    {
        description: 'ZOA/NCT Area/TRACON',
        authorCid: 1275389,
        prefixes: ['NCT', 'SFO', 'OAK', 'SJC', 'SMF', 'RNO', 'MRY', 'MOD', 'BAY', 'ZOA'],
        suffixes: ['APP', 'DEP', 'CTR', 'TMU'],
        mapping: {
            'Area A': 'SJC_APP',
            'Area B': 'SFO_APP',
            'Area C': 'OAK_APP',
            'Area D': 'SFO_DEP',
            'Area E': 'SMF_APP',
            'Area R': 'RNO_APP',
            'NCT TRACON': 'NCT_APP',
            'FAT TRACON': 'FAT_F_APP',
            'NFL RAPCON': 'NFL_APP',
            'NLC RAPCON': 'NLC_APP',
            'SUU RAPCON': 'SUU_S_APP',
        },
    },
    {
        description: 'ZMA TRACON',
        authorCid: 1275389,
        prefixes: ['MIA', 'ZMA', 'TPA', 'RSW', 'NQX', 'HST', 'ZMO'],
        suffixes: ['CTR', 'TMU', 'APP', 'DEP'],
        mapping: {
            'MIA TRACON': 'MIA_D_DEP',
            'TPA TRACON': 'TPA_L_APP',
            'PBI TRACON': 'PBI_B_DEP',
            'RSW TRACON': 'RSW_W_APP',
            'NQX RATCF': 'NQX_B_APP',
            'NQX RAPCON': 'NQX_B_APP',
            'HST RAPCON': 'HST_APP',
        },
    },
    {
        description: 'ZDC Center and PCT',
        authorCid: 1652726,
        prefixes: ['PCT', 'IAD', 'DCA', 'BWI', 'RIC', 'DC'],
        suffixes: ['APP', 'DEP', 'CTR'],
        mapping: {
            'PCT TRACON': 'PCT_APP',
            'SHD Area': 'IAD_APP',
            'CHP Area': 'BWI_APP',
            'MTV Area': 'DCA_APP',
            'JRV Area': 'RIC_APP',
            'ORF TRACON': 'ORF_APP',
            'RDU TRACON': 'RDU_APP',
            'ROA TRACON': 'ROA_APP',
            'ACY TRACON': 'ACY_APP',
            'ILM TRACON': 'ILM_APP',
            'FAY TRACON': 'FAY_APP',
        },
    },
    {
        description: 'ZLA/SCT/L30 Area/TRACON',
        authorCid: 845421,
        prefixes: ['SCT', 'LAX', 'BUR', 'ONT', 'SNA', 'PSP', 'SAN', 'LAS', 'ZLA'],
        suffixes: ['APP', 'DEP', 'CTR', 'TMU'],
        mapping: {
            'Area 1': 'BUR_APP',
            'Area 2': 'LAX_APP',
            'Area 3': 'ONT_APP',
            'Area 4': 'SNA_APP',
            'Area 5': 'SAN_APP',
            'Area 6': 'LAX_DEP',
            Springs: 'PSP_APP',
            'SCT TRACON': 'SCT_APP',
            'L30 TRACON': 'LAS_APP',
            'BFL TRACON': 'BFL_APP',
            'SBA TRACON': 'SBA_APP',
            'NYL CERAP': 'NYL_APP',
            'NTD RAPCON': 'NTD_APP',
            'LSV RAPCON': 'LSV_APP',
            JCF: 'JCF_APP',
            'Sport Control': 'EDW_APP',
        },
    },
    {
        description: 'ZNY/N90 Center and TRACONs',
        authorCid: 1590802,
        prefixes: ['NY'],
        suffixes: ['CTR'],
        mapping: {
            N90: 'NY_APP',
            LGA: 'LGA_APP',
            JFK: 'JFK_APP',
            ISP: 'ISP_APP',
            CSK: 'SWF_APP',
            LIB: 'NY_LW_DEP',
            PHL: 'PHL_N_APP',
            BDA: 'BDA_CTR',
            BGM: 'BGM_L_APP',
            ELM: 'ELM_S_APP',
        },
    },
    {
        description: 'ZNY/N90 Center and TRACONs',
        authorCid: 1590802,
        prefixes: ['NY', 'EWR', 'LGA', 'JFK'],
        suffixes: ['APP', 'DEP'],
        mapping: {
            N90: 'NY_APP',
            EWR: 'EWR_APP',
            LGA: 'LGA_APP',
            JFK: 'JFK_APP',
            ISP: 'ISP_APP',
            CSK: 'SWF_APP',
            LIB: 'NY_LW_DEP',
        },
    },
    {
        description: 'LECB Area',
        authorCid: 1558357,
        matchRegex: /^LECB_(?:RW[\d_]?|LLI|PPI)_CTR$/,
        mapping: {
            BCN: 'LEBL_APP',
            LEIB: 'LEIB_APP',
        },
    },
    {
        description: 'ZTL/A80 Center and TRACONs',
        authorCid: 1560654,
        prefixes: ['ATL', 'A80', 'AHN', 'MCN', 'CSG'],
        suffixes: ['CTR', 'APP', 'DEP'],
        mapping: {
            AGS: 'AGS_APP',
            GSO: 'GSO_APP',
            AHN: 'AHN_APP',
            CSG: 'CSG_APP',
            MCN: 'MCN_APP',
        },
    },
    {
        description: 'ZJX Center and TRACONs',
        authorCid: 1487925,
        prefixes: ['F11', 'ZJX', 'DAB', 'JAX', 'VAD', 'TLH', 'PAM', 'VPS', 'OZR', 'P31', 'SAV', 'NBC', 'CHS', 'SSC', 'CAE', 'MYR', 'FLO'],
        suffixes: ['CTR', 'TMU', 'APP', 'DEP'],
        mapping: {
            'F11 TRACON': 'MCO_E_APP',
            'DAB TRACON': 'DAB_N_APP',
            'JAX TRACON': 'JAX_S_APP',
            'VAD RAPCON': 'VAD_APP',
            'TLH TRACON': 'TLH_W_APP',
            'PAM RAPCON': 'PAM_APP',
            'VPS RAPCON': 'VPS_S_APP',
            'OZR RAPCON': 'OZR_APP',
            'P31 TRACON': 'PNS_E_APP',
            'SAV TRACON': 'SAV_N_APP',
            'NBC RAPCON': 'NBC_APP',
            'CHS TRACON': 'CHS_W_APP',
            'SSC RAPCON': 'SSC_APP',
            'CAE TRACON': 'CAE_N_APP',
            'MYR TRACON': 'MYR_E_APP',
            'FLO TRACON': 'FLO_APP',
        },
    },
    {
        description: 'ZKC Center and TRACONs',
        authorCid: 1190916,
        prefixes: ['KC'],
        suffixes: ['CTR'],
        mapping: {
            T75: 'T75_APP',
            TUL: 'TUL_APP',
            SGF: 'SGF_S_APP',
        },
    },
    {
        description: 'ZDV - Combined D01 TRACON',
        authorCid: 1378019,
        prefixes: ['DEN', 'D01', 'GJT', 'PUB'],
        suffixes: ['APP', 'DEP'],
        mapping: {
            DEN: 'DEN_APP',
            GJT: 'GJT_APP',
            PUB: 'PUB_APP',
        },
    },
    {
        description: 'ZLC - Combined Big Sky TRACON',
        authorCid: 1378019,
        prefixes: ['BOI', 'BZN'],
        suffixes: ['APP', 'DEP'],
        mapping: {
            BOI: 'BOI_APP',
            BZN: 'BZN_APP',
        },
    },
    {
        description: 'CZYZ FIR Terminal Sectors',
        authorCid: 1401686,
        prefixes: ['TOR'],
        suffixes: ['DEP', 'APP', 'CTR'],
        mapping: {
            'XU Sector': 'TOR_XU_APP',
            'WS Sector': 'TOR_WS_APP',
            'ES Sector': 'TOR_ES_APP',
            'TR MTCA': 'CYTR_APP',
            'YZ TCA': 'TOR_APP',
        },
    },
    {
        description: 'ZAU Center and TRACONs',
        authorCid: 1634151,
        matchRegex: /^CHI_(\d+_)?CTR$/,
        mapping: {
            AZO: 'AZO_G_APP',
            CMI: 'CMI_E_APP',
            FWA: 'FWA_W_APP',
            VOK: 'VOK_APP',
            OSH: 'OSH_V_APP',
        },
    },
    {
        description: 'ZME Center and TRACONs',
        authorCid: 1098471,
        matchRegex: /^MEM_\d{1,3}_CTR$/,
        mapping: {
            FSM: 'FSM_S_APP',
            HSV: 'HSV_E_APP',
            NMM: 'NMM_APP',
        },
    },
    {
        description: 'ACC Curitiba (SBCW)',
        authorCid: 1233530,
        prefixes: ['SBCW'],
        suffixes: ['CTR'],
        mapping: {
            SBWI: 'SBWI_APP',
            SBXP: 'SBXP_APP',
        },
    },
    {
        description: 'TMA Rio (SBWJ)',
        authorCid: 1233530,
        prefixes: ['SBWJ'],
        suffixes: ['APP'],
        mapping: {
            SBES: 'SBES_APP',
        },
    },
    {
        description: 'CMH TRACON',
        authorCid: 1283146,
        prefixes: ['CMH', 'DAY'],
        suffixes: ['APP'],
        mapping: {
            'CMH East': 'CMH_N_APP',
            'CMH West': 'DAY_M_APP',
        },
    },
    {
        description: 'UWWW FIR APP Sectors',
        authorCid: 1306046,
        prefixes: ['UWWW'],
        suffixes: ['CTR'],
        mapping: {
            'Samara APP': 'UWWW_APP',
            'Ufa APP': 'UWUU_APP',
            'Kazan APP': 'UWKD_APP',
        },
    },
] satisfies DuplicatingSettingV2[] as DuplicatingSettingV2[];
