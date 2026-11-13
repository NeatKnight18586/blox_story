# Higgsfield account check (2026-11-10, read-only, no credits spent)

Checked through the connected Higgsfield MCP tools (`balance`, `transactions`, `show_plans_and_credits`, `models_explore`, `generate_3d` with `get_cost:true`).

## Account
- Plan: **free**, balance **10 credits** (registration grant only).
- Free trial: **not eligible** (`trial_status.eligible: false`); unlimited MCP generation inactive.
- Paid plans offered: Plus $49/mo or $29/mo billed annually (1,000 credits/mo); Ultra $99/mo or $70/mo billed annually (3,000 credits/mo).
- The plan screen says its unlimited bundles are "Buy until: Nov 11" and run on the web app, not through MCP.

## 3D tools available (all output GLB)
| Model | Use | Quoted cost |
|---|---|---|
| `hunyuan3d_v3_image_to_3d` (LowPoly) | image → low-poly mesh | 14 credits |
| `tripo_p2_image_to_3d` (texture + PBR, 20k faces) | image → textured mesh | 34 credits |
| `meshy_v7_image_to_3d` (textured, 30k) | image → textured mesh | 38 credits |
| `meshy_v7_image_to_3d` (textured + auto-rig, A-pose) | image → rigged humanoid | 44 credits |
| Also listed | multi-view → 3D, text → 3D, rigging an existing GLB, remesh, retexture, 678-clip animation library | not quoted |

Every 3D generation costs more than the current balance.

## Decision
- Characters stay code-built (six-part rig): auto-rigged generated meshes deform as one body and break the Roblox look.
- If credits are bought later, spend them on static props only (lamps, stalls, trees, fountain), each approved first, downloaded, validated in Three.js and recorded in an asset manifest.
- Nothing in the repo depends on Higgsfield; every render works offline.
