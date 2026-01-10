interface DuplicatingSetting {
    regex: RegExp;
    /**
     * @description ATIS line: callsign
     */
    mapping: Record<string, string>;
}

// TODO: rewrite to list of prefixes/suffixes
export const duplicatingSettings = [
    /**
     * @description ZOA/NCT Area/TRACON
     * @author 1275389
     */
    {
        regex: /^(NCT|SFO|OAK|SJC|SMF|RNO|MRY|MOD|BAY|ZOA)(_\w{0,3})?_(APP|DEP|CTR|TMU)$/,
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
    /**
     * @description ZMA TRACON
     * @author 1275389
     */
    {
        regex: /^(MIA|ZMA|TPA|PBI|RSW|NQX|HST|ZMO)(_\w{0,3})?_(CTR|TMU|APP|DEP)$$/,
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
    /**
     * @description ZDC Center and PCT
     * @author 1652726
     */
    {
        regex: /^(PCT|IAD|DCA|BWI|RIC|DC)(_\w{0,3})?_(APP|DEP|CTR)$/,
        mapping: {
            PCT: 'PCT_APP',
            SHD: 'IAD_APP',
            CHP: 'BWI_APP',
            MTV: 'DCA_APP',
            JRV: 'RIC_APP',
            ORF: 'ORF_APP',
            RDU: 'RDU_APP',
            ROA: 'ROA_APP',
            ACY: 'ACY_APP',
            ILM: 'ILM_APP',
            FAY: 'FAY_APP',
        },
    },
    /**
    * @description ZLA/SCT/L30 Area/TRACON
    * @author 845421
    */
    {
        regex: /^(SCT|LAX|BUR|ONT|SNA|PSP|SAN|LAS|ZLA)(_\w{0,3})?_(APP|DEP|CTR|TMU)$/,
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
    /**
    * @description ZNY/N90 Center and TRACONs
    * @author 1590802 and 1084329
    */
    {
        regex: /^(NY)(_\w{0,3})?_(CTR)$/,
        mapping: {
            N90: 'NY_APP',
            EWR: 'EWR_APP',
            LGA: 'LGA_APP',
            JFK: 'JFK_APP',
            ISP: 'ISP_APP',
            CSK: 'SWF_APP',
            LIB: 'NY_LW_DEP',
            PHL: 'PHL_N_APP',
            ABE: 'ABE_APP',
            AVP: 'AVP_S_APP',
            BDA: 'BDA_CTR',
            BGM: 'BGM_L_APP',
            ELM: 'ELM_S_APP',
            MDT: 'MDT_APP',
            WRI: 'WRI_APP',
        },
    },
    /**
     * @description ZNY/N90 Center and TRACONs
     * @author 1590802 and 1084329
     */
    {
        regex: /^(NY|EWR|LGA|JFK)(_\w{0,3})?_(APP|DEP)$/,
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
    /**
    * @description LECB Area
    * @author 1558357
    */
    {
        regex: /^LECB_RW\d?_CTR$/,
        mapping: {
            BCN: 'LEBL_APP',
            LEIB: 'LEIB_APP',
        },
    },
    /**
    * @description ZHU Center and TRACONs
    * @author 1010912
    */
    {
        regex: /^HOU_\d{2}_CTR$/,
        mapping: {
            I90: 'I90_D_APP',
            AUS: 'AUS_W_APP',
            BTR: 'BTR_W_APP',
            CRP: 'CRP_N_APP',
            GPT: 'GPT_W_APP',
            LCH: 'LCH_E_APP',
            LFT: 'LFT_W_APP',
            MOB: 'MOB_W_APP',
            MSY: 'MSY_W_APP',
            SAT: 'SAT_N_APP',
            DLF: 'DLF_E_APP',
            NQI: 'NQI_APP',
            POE: 'POE_APP',
        },
    }
] satisfies DuplicatingSetting[];
