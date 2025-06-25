
export const qualityColor = (quality: string): string => {
  switch (quality) {
    case "Unique":
      return "text-color-unique";
    case "Set":
      return "text-green-400";
    case "Rare":
      return "text-yellow-400";
    case "Crafted":
      return "text-yellow-600";
    case "Magic":
      return "text-blue-400";
    default:
      return "text-gray-100";
  }
};