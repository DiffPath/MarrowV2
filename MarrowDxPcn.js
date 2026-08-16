/* ============================================================================
   MarrowDxPcn.js — the plasma cell family: the three answers a marrow sent to
   "rule out plasma cell neoplasm" can give.

   NOT A MYELOMA ENGINE, by design. The classifications separate MGUS from
   plasma cell myeloma on serum M-protein concentration and myeloma-defining
   events (CRAB/SLiM), none of which this app collects — so the neoplasm rule
   names the umbrella, and every comment in this family says what still has to
   be correlated. The marrow's own two questions ARE answerable from the inputs
   (f.plasma, MarrowFindings.js): how many plasma cells (the counted aspirate
   percentage, CD138 as substitute) and whether they are clonal (kappa/lambda
   ISH). The 10% line is the one number the family gates on, because it is the
   one number the classifications put on the marrow itself.

   The family exists because the workup selector on the Specimen tab reaches it
   (dxWorkupBonus in MarrowDxEngine.js): choosing "Rule out plasma cell
   neoplasm" surfaces these three candidates even on an otherwise blank form —
   the author's instruction. No criteria box for MGUS or plasma cell myeloma
   has been pasted into docs/who yet; these rules were written from the
   marrow-side criteria only and deliberately assert nothing the marrow cannot
   show. When the chapters are pasted, read the rules against them.
   ========================================================================= */


/* The one threshold. Counted aspirate percentage first, CD138 as the fallback
   — whichever f.plasma.marrowPct carries (see findingPlasma). */
function dxPlasmaAtLeast10(f) {
    if (f.plasma.marrowPct === null) return null;
    return f.plasma.marrowPct >= 10;
}

/* "a clonal (kappa-restricted) plasma cell population comprising approximately
   12% of marrow cells" — the shared fragment, built from whatever is in hand
   so a missing piece shrinks the phrase instead of leaving a hole. */
function dxPlasmaPhrase(f) {
    const p = f.plasma;
    let phrase = p.clonal === true
        ? 'a clonal' + (p.restriction ? ' (' + p.restriction + '-restricted)' : '')
        : 'a';
    phrase += ' plasma cell population';
    if (p.marrowPct !== null) {
        phrase += ' comprising approximately ' + dxPct(p.marrowPct) + '% of marrow cells';
        if (p.pctBasis === 'cd138' || p.pctBasis === 'cd138Range') phrase += ' by CD138';
    }
    return phrase;
}

const DX_PLASMA_CORRELATE = 'Correlation with serum protein electrophoresis, free light ' +
    'chain studies, imaging, and clinical findings is recommended.';

dxRules.push(
    {
        id: 'plasmaNeoplasm',
        family: 'pcn',
        who: 'Plasma cell neoplasm',
        icc: null,
        prior: 0,
        priorReason: 'plasma cell myeloma incidence is roughly 4-5 per 100 000 person-years',
        requires: [
            ['a clonal plasma cell population', function (f) { return f.plasma.clonal; }],
            ['plasma cells at or above 10% of marrow cells', dxPlasmaAtLeast10]
        ],
        supports: [
            ['plasma cells at or above 10% of marrow cells', 3, dxPlasmaAtLeast10],
            ['light-chain restriction', 3, function (f) { return f.plasma.clonal; }],
            ['plasma cells increased on sections', 1, function (f) { return f.plasma.increased; }]
        ],
        /* Always, while the rule is live: nothing in this app can tell myeloma
           from a smoldering process or an amyloidosis-associated clone. */
        caution: function () {
            return 'Subclassification of a plasma cell neoplasm (including the distinction of ' +
                'plasma cell myeloma from smoldering myeloma) requires serum protein studies and ' +
                'clinical correlation, which are beyond the scope of this evaluation.';
        },
        comment: function (f) {
            const parts = ['Sections and smears show ' + dxPlasmaPhrase(f) + '.'];
            parts.push('The findings are those of a plasma cell neoplasm.');
            parts.push(DX_PLASMA_CORRELATE);
            return parts.join(' ');
        }
    },
    {
        id: 'mgus',
        family: 'pcn',
        who: 'Monoclonal gammopathy of undetermined significance (MGUS)',
        icc: null,
        prior: 1,
        priorReason: 'MGUS is present in roughly 3% of adults over 50, far commoner than myeloma',
        requires: [
            ['a clonal plasma cell population', function (f) { return f.plasma.clonal; }],
            ['clonal plasma cells below 10% of marrow cells', function (f) {
                return dxNot(dxPlasmaAtLeast10(f));
            }]
        ],
        supports: [
            ['light-chain restriction', 2, function (f) { return f.plasma.clonal; }]
        ],
        caution: function () {
            return 'The designation of MGUS additionally requires a serum monoclonal protein ' +
                'below 3 g/dL and the absence of myeloma-defining events, which cannot be ' +
                'assessed on the marrow alone.';
        },
        comment: function (f) {
            const parts = ['Sections and smears show ' + dxPlasmaPhrase(f) + '.'];
            parts.push('In the absence of increased plasma cells, the findings are compatible ' +
                'with a monoclonal gammopathy of undetermined significance.');
            parts.push(DX_PLASMA_CORRELATE);
            return parts.join(' ');
        }
    },
    {
        id: 'noPcn',
        family: 'pcn',
        who: 'No evidence of a plasma cell neoplasm',
        icc: null,
        /* The floor of this family's differential, ranked by its prior exactly
           as noNeoplasm is (see MarrowDxCh.js): no positive weights for
           absences — it leads when nothing else fits and yields the moment
           anything does. */
        prior: 2,
        priorReason: 'most marrows sent to rule out a plasma cell neoplasm do not show one',
        requires: [
            ['plasma cells not increased', function (f) { return dxNot(f.plasma.increased); }],
            ['no light-chain restriction', function (f) { return dxNot(f.plasma.clonal); }]
        ],
        comment: function (f) {
            const parts = [];
            if (f.plasma.clonal === false) {
                parts.push('Plasma cells are not increased and are polytypic by kappa/lambda ' +
                    'in situ hybridization.');
            } else {
                parts.push('Plasma cells are not increased.');
            }
            parts.push('There is no evidence of a plasma cell neoplasm.');
            return parts.join(' ');
        }
    }
);
