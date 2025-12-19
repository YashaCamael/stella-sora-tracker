/* --- GAME CONFIGURATION & DATA --- */

(function (global) {
    const Config = {
        // Change this if your images are hosted elsewhere
        ASSET_BASE_URL: "https://your-storage-service.com/stella-sora/assets/",

        // PASTE YOUR CUSTOM LINKS HERE
        // Format: "Key": "URL"
        // Key format: characterId_role_number
        // Example: "c1_main_1": "https://imgur.com/example.png"
        IMAGE_OVERRIDES: {
            // "c1_main_1": "https://example.com/my-custom-image.png",
        },

        MAX_LEVEL: 6,
        BASE_CAP_MAIN: 6,
        BASE_CAP_SUPP: 5
    };

    const baseCharacters = [
        { id: "c1", name: "Chitose", element: "Aqua" },
        { id: "c2", name: "Gerie", element: "Terra" },
        { id: "c3", name: "Nazuna", element: "Ventus" },
        { id: "c4", name: "Stella", element: "Ignis" }
    ];

    function generatePotentials() {
        let potentials = [];
        const roles = ['main', 'support'];

        baseCharacters.forEach(char => {
            roles.forEach(role => {
                for (let i = 1; i <= 19; i++) {
                    let rarity = "common";
                    if ([3, 6, 9, 12, 15, 18].includes(i)) rarity = "rare";
                    if (i === 19) rarity = "super";

                    const key = `${char.id}_${role}_${i}`;
                    const imgName = `${key}.png`;

                    // Check for override first, then fallback to base URL
                    const realUrl = Config.IMAGE_OVERRIDES[key] || (Config.ASSET_BASE_URL + imgName);

                    const baseVal = i * 2;
                    let statType = "ATK";
                    if (role === 'support') statType = i % 2 === 0 ? "Shield" : "Heal";
                    if (role === 'main') statType = i % 2 === 0 ? "Crit Dmg" : "ATK Bonus";
                    if (i > 15) statType = "Skill Haste";

                    let levelValues = [];
                    let statValues = [];

                    for (let lvl = 1; lvl <= 6; lvl++) {
                        let val1 = baseVal + (lvl * 2);
                        let val2 = lvl + 2;
                        levelValues.push([val1, val2]);
                        statValues.push({ type: statType, value: val1 });
                    }

                    const template = role === 'main'
                        ? `Increases ${statType} by {0}% for {1}s.`
                        : `Grant ${statType} equal to {0}% of HP for {1}s.`;

                    potentials.push({
                        id: key,
                        charId: char.id,
                        type: role,
                        name: `${char.name} ${role === 'main' ? 'Skill' : 'Buff'} ${i}`,
                        displayNum: i,
                        descTemplate: template,
                        values: levelValues,
                        statData: statValues,
                        rarity: rarity,
                        imgUrl: realUrl,
                        color: rarity === 'super' ? 'f50057' : (rarity === 'rare' ? 'ff4081' : '546e7a')
                    });
                }
            });
        });
        return potentials;
    }

    // Expose to global scope
    global.GameData = {
        config: Config,
        characters: baseCharacters,
        potentials: generatePotentials() // Pre-generate on load
    };

})(window);
