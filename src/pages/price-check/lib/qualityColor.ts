export const qualityColor = (quality: string): string => {
  switch (quality) {
    case 'Unique':
      return 'text-q-unique';
    case 'Set':
      return 'text-q-set';
    case 'Rare':
      return 'text-q-rare';
    case 'Crafted':
      return 'text-q-crafted';
    case 'Magic':
      return 'text-q-magic';
    default:
      return 'text-q-normal';
  }
};
