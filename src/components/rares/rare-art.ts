import type { RareAppraisal, RareSlot } from '@/lib/rare-appraisal-api';

/*
 * Inventory art of appraised rares (pd2trader.com /assets/items/<invfile>.png, the art the price check uses).
 * Port of pd2-price-crawler client/src/components/wealth/rares/RareIcon.jsx: exceptional and elite bases share
 * their normal base's art in D2, so each family lists all three tier names. Bases without art fall back to the
 * slot's art; jewels pick one of the six jewel colours by item id.
 */
const FAMILIES: string[][] = [
  // Helms / circlets
  ['invcap', 'Cap', 'War Hat', 'Shako'],
  ['invskp', 'Skull Cap', 'Sallet', 'Hydraskull'],
  ['invhlm', 'Helm', 'Casque', 'Armet'],
  ['invfhl', 'Full Helm', 'Basinet', 'Giant Conch'],
  ['invghm', 'Great Helm', 'Winged Helm', 'Spired Helm'],
  ['invcrn', 'Crown', 'Grand Crown', 'Corona'],
  ['invmsk', 'Mask', 'Death Mask', 'Demonhead'],
  ['invbhm', 'Bone Helm', 'Grim Helm', 'Bone Visage'],
  ['invci0', 'Circlet', 'Coronet'],
  ['invci2', 'Tiara'],
  ['invci3', 'Diadem'],
  // Gloves
  ['invlgl', 'Leather Gloves', 'Demonhide Gloves', 'Bramble Mitts'],
  ['invvgl', 'Heavy Gloves', 'Sharkskin Gloves', 'Vampirebone Gloves'],
  ['invmgl', 'Chain Gloves', 'Heavy Bracers', 'Vambraces'],
  ['invtgl', 'Light Gauntlets', 'Battle Gauntlets', 'Crusader Gauntlets'],
  ['invhgl', 'Gauntlets', 'War Gauntlets', 'Ogre Gauntlets'],
  // Boots
  ['invlbt', 'Boots', 'Demonhide Boots', 'Wyrmhide Boots'],
  ['invvbt', 'Heavy Boots', 'Sharkskin Boots', 'Scarabshell Boots'],
  ['invmbt', 'Chain Boots', 'Mesh Boots', 'Boneweave Boots'],
  ['invtbt', 'Light Plated Boots', 'Battle Boots', 'Mirrored Boots'],
  ['invhbt', 'Greaves', 'War Boots', 'Myrmidon Greaves'],
  // Belts
  ['invlbl', 'Sash', 'Demonhide Sash', 'Spiderweb Sash'],
  ['invvbl', 'Light Belt', 'Sharkskin Belt', 'Vampirefang Belt'],
  ['invmbl', 'Belt', 'Mesh Belt', 'Mithril Coil'],
  ['invtbl', 'Heavy Belt', 'Battle Belt', 'Troll Belt'],
  ['invhbl', 'Plated Belt', 'War Belt', 'Colossus Girdle'],
  // Body armor
  ['invqlt', 'Quilted Armor', 'Ghost Armor', 'Dusk Shroud'],
  ['invlea', 'Leather Armor', 'Serpentskin Armor', 'Wyrmhide'],
  ['invhla', 'Hard Leather Armor', 'Demonhide Armor', 'Scarab Husk'],
  ['invstu', 'Studded Leather', 'Trellised Armor', 'Wire Fleece'],
  ['invrng', 'Ring Mail', 'Linked Mail', 'Diamond Mail'],
  ['invscl', 'Scale Mail', 'Tigulated Mail', 'Loricated Mail'],
  ['invchn', 'Chain Mail', 'Mesh Armor', 'Boneweave'],
  ['invbrs', 'Breast Plate', 'Cuirass', 'Great Hauberk'],
  ['invspl', 'Splint Mail', 'Russet Armor', 'Balrog Skin'],
  ['invplt', 'Plate Mail', 'Templar Coat', 'Hellforge Plate'],
  ['invfld', 'Field Plate', 'Sharktooth Armor', 'Kraken Shell'],
  ['invgth', 'Gothic Plate', 'Embossed Plate', 'Lacquered Plate'],
  ['invful', 'Full Plate Mail', 'Chaos Armor', 'Shadow Plate'],
  ['invaar', 'Ancient Armor', 'Ornate Plate', 'Sacred Armor'],
  ['invltp', 'Light Plate', 'Mage Plate', 'Archon Plate'],
  // Shields
  ['invbuc', 'Buckler', 'Defender', 'Heater'],
  ['invsml', 'Small Shield', 'Round Shield', 'Luna'],
  ['invlrg', 'Large Shield', 'Scutum', 'Hyperion'],
  ['invkit', 'Kite Shield', 'Dragon Shield', 'Monarch'],
  ['invtow', 'Tower Shield', 'Pavise', 'Aegis'],
  ['invgts', 'Gothic Shield', 'Ancient Shield', 'Ward'],
  // Weapons
  ['invssd', 'Short Sword', 'Gladius', 'Falcata'],
  ['invsbr', 'Sabre', 'Shamshir', 'Elegant Blade'],
  ['invflc', 'Falchion', 'Tulwar', 'Hydra Edge'],
  ['invcrs', 'Crystal Sword', 'Dimensional Blade', 'Phase Blade'],
  ['invlsd', 'Long Sword', 'Rune Sword', 'Cryptic Sword'],
  ['invwsd', 'War Sword', 'Ancient Sword', 'Mythical Sword'],
  ['invclm', 'Claymore', 'Dacian Falx', 'Highland Blade'],
  ['invflb', 'Flamberge', 'Zweihander', 'Colossus Sword'],
  ['invgsd', 'Great Sword', 'Executioner Sword', 'Colossus Blade'],
  ['inv2ax', 'Double Axe', 'Twin Axe', 'Ettin Axe'],
  ['invmpi', 'Military Pick', 'Crowbill', 'War Spike'],
  ['invwax', 'War Axe', 'Naga', 'Berserker Axe'],
  ['invlax', 'Large Axe', 'Military Axe', 'Feral Axe'],
  ['invgix', 'Giant Axe', 'Ancient Axe', 'Glorious Axe'],
  ['invmac', 'Mace', 'Flanged Mace', 'Reinforced Mace'],
  ['invmst', 'Morning Star', 'Jagged Star', 'Devil Star'],
  ['invfla', 'Flail', 'Knout', 'Scourge'],
  ['invwhm', 'War Hammer', 'Battle Hammer', 'Legendary Mallet'],
  ['invmau', 'Maul', 'War Club', 'Ogre Maul'],
  ['invgma', 'Great Maul', 'Martel de Fer', 'Thunder Maul'],
  ['invscp', 'Scepter', 'Rune Scepter', 'Mighty Scepter'],
  ['invgsc', 'Grand Scepter', 'Holy Water Sprinkler', 'Seraph Rod'],
  ['invwsp', 'War Scepter', 'Divine Scepter', 'Caduceus'],
  ['invwnd', 'Wand', 'Burnt Wand', 'Polished Wand'],
  ['invywn', 'Yew Wand', 'Petrified Wand', 'Ghost Wand'],
  ['invbwn', 'Bone Wand', 'Tomb Wand', 'Lich Wand'],
  ['invgwn', 'Grim Wand', 'Grave Wand', 'Unearthed Wand'],
  ['invsst', 'Short Staff', 'Jo Staff', 'Walking Stick'],
  ['invlst', 'Long Staff', 'Quarterstaff', 'Stalagmite'],
  ['invcst', 'Gnarled Staff', 'Cedar Staff', 'Elder Staff'],
  ['invbst', 'Battle Staff', 'Rune Staff', 'Shillelagh'],
  ['invwst', 'War Staff', 'Archon Staff'],
  ['invbar', 'Bardiche', 'Lochaber Axe', 'Ogre Axe'],
  ['invvou', 'Voulge', 'Bill', 'Colossus Voulge'],
  ['invscy', 'Scythe', 'Battle Scythe', 'Thresher'],
  ['invpax', 'Poleaxe', 'Partizan', 'Cryptic Axe'],
  ['invhal', 'Halberd', 'Bec-de-Corbin', 'Great Poleaxe'],
  ['invwsc', 'War Scythe', 'Grim Scythe', 'Giant Thresher'],
  ['invspr', 'Spear', 'War Spear', 'Hyperion Spear'],
  ['invbrn', 'Brandistock', 'War Fork', 'Mancatcher'],
  ['invspt', 'Spetum', 'Yari', 'Ghost Spear'],
  ['invpik', 'Pike', 'Lance', 'War Pike'],
  ['invsbw', 'Short Bow', 'Edge Bow', 'Spider Bow'],
  ['invhbw', "Hunter's Bow", 'Razor Bow', 'Blade Bow'],
  ['invlbw', 'Long Bow', 'Cedar Bow', 'Shadow Bow'],
  ['invlbb', 'Long Battle Bow', 'Large Siege Bow', 'Crusader Bow'],
  ['invswb', 'Short War Bow', 'Rune Bow', 'Ward Bow'],
  ['invlwb', 'Long War Bow', 'Gothic Bow', 'Hydra Bow'],
  ['invdgr', 'Dagger', 'Poignard', 'Bone Knife'],
  ['invdir', 'Dirk', 'Rondel', 'Mithril Point'],
  ['invbld', 'Blade', 'Stiletto', 'Legend Spike'],
  ['invtax', 'Throwing Axe', 'Francisca', 'Flying Axe'],
  ['invbal', 'Balanced Axe', 'Hurlbat', 'Winged Axe'],
  ['invktr', 'Katar', 'Quhab', 'Suwayyah'],
  ['invclw', 'Claws', 'Greater Claws', 'Feral Claws'],
  ['invskr', 'Scissors Katar', 'Scissors Quhab', 'Scissors Suwayyah'],
];

const BASE_ART: Record<string, string> = Object.fromEntries(
  FAMILIES.flatMap(([art, ...names]) => names.map((name) => [name.toLowerCase(), art])),
);

/** Fallback art per slot (jewels and quivers are handled in rareArt). */
const SLOT_ART: Partial<Record<RareSlot, string>> = {
  ring: 'invrin',
  amul: 'invamu',
  circ: 'invci0',
  glov: 'invlgl',
  boot: 'invlbt',
  belt: 'invmbl',
  tors: 'invlea',
  helm: 'invcap',
  shield: 'invbuc',
  weapon: 'invlsd',
};

/** Inventory art URL of a rare: base art, else slot art; jewels get one of invgswe1–6 (stable per item). */
export function rareArtUrl(rare: RareAppraisal): string {
  let art: string;
  if (rare.slot === 'jewl') {
    let h = 0;
    for (const ch of rare.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    art = `invgswe${(h % 6) + 1}`;
  } else if (rare.slot === 'quiver') {
    art = /bolts/i.test(rare.baseName) ? 'invcqv' : 'invqvr';
  } else {
    art = BASE_ART[rare.baseName.toLowerCase()] ?? SLOT_ART[rare.slot] ?? 'invrin';
  }
  return `https://pd2trader.com/assets/items/${art}.png`;
}
