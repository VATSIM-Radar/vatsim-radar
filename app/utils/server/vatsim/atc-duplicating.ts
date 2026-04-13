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
        regex: /^LECB_(?:RW[\d_]?|LLI|PPI)_CTR$/,
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
            VLY: 'VLY_X_APP',
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
    },

    /**
    * @description ZTL/A80 Center and TRACONs
    * @author 1560654
    */
    {
        regex: /^(ATL|A80|AHN|MCN|CSG)(?:_\w{1,3})?_(CTR|APP|DEP)$/,
        mapping: {
            ATL: 'ATL_APP',
            AGS: 'AGS_APP',
            AHN: 'AHN_APP',
            CSG: 'CSG_APP',
            MCN: 'MCN_APP',
            CLT: 'CLT_APP',
            AVL: 'AVL_APP',
            BHM: 'BHM_APP',
            CHA: 'CHA_APP',
            GSO: 'GSO_APP',
            GSP: 'GSP_APP',
            MGM: 'MGM_APP',
            TYS: 'TYS_APP',
            TRI: 'TRY_APP',
        },
    },
    /**
    * @description ZJX Center and TRACONs
    * @author 1487925
    */
    {
        regex: /^(F11|ZJX|DAB|JAX|VAD|TLH|PAM|VPS|OZR|P31|SAV|NBC|CHS|SSC|CAE|MYR|FLO)(_\w{0,3})?_(CTR|TMU|APP|DEP)$$/,
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
    /**
     * @description ZKC Center and TRACONs
     * @author 1190916
     */
    {
        regex: /^(KC)(_\w{0,3})?_(CTR)$/,
        mapping: {
            T75: 'T75_APP',
            TUL: 'TUL_APP',
            ICT: 'ICT_APP',
            SGF: 'SGF_S_APP',
            MZU: 'MZU_APP',
            MCI: 'KC_APP',
            END: 'END_APP',
            SZL: 'SZL_APP',
        },
    },
    /**
     * @description MHCC_CTR And Tracoons
     * @author 1794201 and 1753002
     */
    {
        regex: /^MHCC(_\w{0,3})?_CTR$/,
        mapping: {
            GUA: 'MGGT_APP',
            FRS: 'MGMM_APP',
            BZE: 'MZBZ_APP',
            SAP: 'MHLM_DEP',
            LCE: 'MHLC_APP',
            RTB: 'MHRO_APP',
            TGU: 'MHTG_APP',
            SAL: 'MSLP_APP',
            MGA: 'MNMG_APP',
            LIR: 'MRLB_APP',
            SJO: 'MROC_C_APP',
        },
    },
    /**
    * @description ZDV Center and TRACONs
    * @author 1378019
    */
    {
        regex: /^(DEN|D01|GJT|PUB|RCA|COS|CYS|CPR|ASE)(_\w{0,3})?_(CTR|TMU|APP|DEP)$/,
        mapping: {
            DEN: 'DEN_APP',
            GJT: 'GJT_APP',
            PUB: 'PUB_APP',
            RCA: 'RCA_APP',
            COS: 'COS_APP',
            CYS: 'CYS_APP',
            ASE: 'ASE_APP',
            CPR: 'CPR_APP',
        },
    },
    /**
    * @description ZLC Center and TRACONs
    * @author 1378019
    */
    {
        regex: /^(SLC|BOI|BZN|BIL|GTF|MSO|MUO|HLN|TWF)(_\w{0,3})?_(CTR|TMU|APP|DEP)$/,
        mapping: {
            SLC: 'SLC_APP',
            BOI: 'BOI_APP',
            BZN: 'BZN_APP',
            BIL: 'BIL_APP',
            GTF: 'GTF_APP',
            MSO: 'MSO_APP',
            MUO: 'MUO_APP',
            HLN: 'HLN_APP',
            TWF: 'TWF_APP',
        },
    },
    /**
    * @description CZYZ FIR Terminal Sectors
    * @author 1401686 and 1448618
    */
    {
        regex: /^TOR(_\w{0,3})?_(DEP|APP|CTR)$/,
        mapping: {
            'XU Sector': 'TOR_XU_APP',
            'WS Sector': 'TOR_WS_APP',
            'ES Sector': 'TOR_ES_APP',
            'TR MTCA': 'CYTR_APP',
            'YZ TCA': 'TOR_APP',
        },
    },
    /**
     * @description ZAU Center and TRACONs
     * @author 1634151
     */
    {
        regex: /^CHI_(\d+_)?CTR$/,
        mapping: {
            C90: 'CHI_Z_APP',
            AZO: 'AZO_G_APP',
            CID: 'CID_S_APP',
            CMI: 'CMI_E_APP',
            FWA: 'FWA_W_APP',
            MKE: 'MKE_E_APP',
            MLI: 'MLI_N_APP',
            MSN: 'MSN_W_APP',
            RFD: 'RFD_E_APP',
            SBN: 'SBN_N_APP',
            GUS: 'GUS_E_APP',
            VOK: 'VOK_APP',
            OSH: 'OSH_V_APP',
        },
    },
    /**
     * @description HCF Center and TRACONs
     * @author 1897191
     */
    {
        regex: /^HNL_(\d+_)?CTR$/,
        mapping: {
            HNL: 'HNL_H_APP',
            NGF: 'NGF_APP',
            OGG: 'OGG_S_APP',
            ITO: 'ITO_APP',
        },
    },
     /**
    * @description ZME Center and TRACONs
    * @author 1098471
    */
    {
        regex: /(?i)\b(?:MEM|BNA|LIT|FSM|JAN|HSV|HOP|NMM|CBM)\b/,
        mapping: {
            MEM: 'MEM_E_APP',
            BNA: 'BNA_X_DEP',
            LIT: 'LIT_W_APP',
            FSM: 'FSM_S_APP',
            JAN: 'JAN_W_APP',
            HSV: 'HSV_E_APP',
            HOP: 'HOP_S_APP',
            CBM: 'CBM_E_APP',
            NMM: 'NMM_APP',
        },
    },
] satisfies DuplicatingSetting[];
