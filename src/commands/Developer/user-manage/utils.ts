export function getRarityDisplay(rarity: string): string {
  const rarityColors: Record<string, string> = {
    common: '⚪ Common',
    uncommon: '🟢 Uncommon',
    rare: '🔵 Rare',
    epic: '🟣 Epic',
    legendary: '🟡 Legendary',
    mythical: '🔴 Mythical',
    divine: '✨ Divine',
    cursed: '💀 Cursed'
  };
  return rarityColors[rarity] || rarity;
}

export function getMostValuableItem(inventory: any[]): string {
  if (inventory.length === 0) return 'None';

  const valuable = inventory.reduce((prev, current) => {
    const prevValue = (prev.purchasePrice || 0) * prev.quantity;
    const currentValue = (current.purchasePrice || 0) * current.quantity;
    return currentValue > prevValue ? current : prev;
  });

  return `${valuable.name} (${((valuable.purchasePrice || 0) * valuable.quantity).toLocaleString()} coins)`;
}
