/** Monitoring notes for the seeded demo runs, keyed by borrower id. */
export const DEMO_NOTES: Readonly<Record<string, string>> = {
  harbourline: `All three covenants are met with comfortable headroom for the September 2026 test period.

Net leverage is 2.07x against a maximum of 3.50x, interest cover 6.06x against a minimum of 2.00x, and liquidity $7.42m against a minimum of $2.50m. TTM EBITDA of $7.94m is up on the prior year ($7.70m), supported by new retail volumes on the Melbourne–Sydney linehaul.

No new borrowings were drawn in the month. No action required.`,
  corella: `Net leverage and interest cover are within limits but inside the 10% watch band.

Net leverage is 3.41x against a maximum of 3.50x (2.7% headroom) and interest cover 2.43x against a minimum of 2.25x (8.2% headroom). Liquidity of $3.45m meets the $3.00m minimum. Management attributes weaker margins to wet weather in the Lockyer Valley and an additional $1.2m revolver drawing in August to fund working capital.

Recommend monthly contact with the CFO until the November receivables unwind is confirmed, and a request for the December quarter forecast.`,
  "wattle-grove": `Net leverage is in breach. The compliance certificate does not reflect this.

Net leverage is 4.06x against a maximum of 3.75x, calculated on reported TTM EBITDA of $3.88m (P&L, page 3). The borrower's certificate (page 6) reports 3.62x and compliance by using EBITDA of $4.35m, after adding back $310k of agency staffing costs and $160k of consulting fees. These add-backs are not permitted under the facility definition of EBITDA, and agency costs have recurred across the period.

Liquidity of $1.54m is within 2.7% of the $1.50m minimum, with month-end cash reduced by the timing of government funding. Interest cover of 2.26x passes.

Recommend issuing a reservation of rights, requesting a corrected compliance certificate, and escalating to the credit committee.`
}
