# PokéRogue Fractura

This fork keeps PokéRogue's battle engine, Pokémon data, moves, abilities, starter costs, candies, evolutions and existing gacha as its core. New systems are layered on top.

## Implemented in milestone 0.3

- Base wild shiny rate: 1/256.
- Egg Gacha shiny rate: 1/64; Shiny-Up: 1/32.
- Legendary-Up is substantially stronger and legendary/epic/rare pity activates sooner.
- Shiny variants are less punishing: basic / rare / epic variants are approximately 50% / 30% / 20% when variant assets exist.
- Party luck cap expanded from 14 to 18 with a new maximum rank: **SSSS**. Six red/epic shinies can reach the cap.
- Vouchers have much higher reward-pool weights and Classic grants a voucher every 10 completed waves (Plus every 50).
- A visual branching route-map UI replaces the plain biome-choice popup when several biome exits exist.
- First story framework with persistent local choices and events after waves 10, 30 and 60. Choices alter investigation/compassion/defiance flags and can grant different rewards.
- A new **Ruleta Fractura** is available from the in-game menu. One regular voucher buys one spin; prizes include eggs, rare/epic/legendary eggs, shiny eggs, red-shiny eggs and Voucher Plus.

## Next milestones

1. Expand the route map from biome branches to per-node routes (wild battle, trainer, elite, event, shop, camp, gacha, roulette, boss).
2. Expand the dedicated Fractura Gachapon layer while preserving the original Egg Gacha.
3. Expand roulette rewards with pity/protection, candies, relics and rare-encounter tickets.
4. Add run-wide relics and build archetypes (weather, poison, crit, priority, capture, monotype, healing, hazards).
5. Make story flags alter bosses, allies, routes, legendary encounters and endings.
6. Add multi-phase bosses, a persistent rival, secret routes and Endless world modifiers.
