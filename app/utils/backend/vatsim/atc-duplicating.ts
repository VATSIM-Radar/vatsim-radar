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
     * @description ZDC PCT
     * @author 1652726
     */
    {
        regex: /^(PCT|IAD|DCA|BWI|RIC|DC)(_\w{0,3})?_(APP|DEP|CTR)$/,
        mapping: {
            SHD: 'IAD_APP',
            CHP: 'BWI_APP',
            MTV: 'DCA_APP',
            JRV: 'RIC_APP',
        },
    },
] satisfies DuplicatingSetting[];
