# ═══ C. AI-look check (Design tab) + builder steer ═══
rep("/* ═══════════════════ ASSISTANT — the front door",rd('slop.js')+"\n/* ═══════════════════ ASSISTANT — the front door")
rep("  comfy:'🖼 ComfyUI',skin:'🪄 Skin Glassbox Jet',assets:'🗂 Assets'};","  comfy:'🖼 ComfyUI',skin:'🪄 Skin Glassbox Jet',assets:'🗂 Assets',slop:'🔎 AI-look check'};")
rep("    sites:dsSites,comfy:dsComfy,skin:dsSkin,assets:dsAssets}","    sites:dsSites,comfy:dsComfy,skin:dsSkin,assets:dsAssets,slop:dsSlop}")
rep("stable:[sysOverride||BUILDER_SYS,typeSteer(RS&&RS.projType),","stable:[sysOverride||BUILDER_SYS,typeSteer(RS&&RS.projType),slopSteer37(),")
EXPORTS+=['slopCheck37','slopSteer37']
