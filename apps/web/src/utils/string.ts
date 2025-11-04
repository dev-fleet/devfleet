export function getNameInitials(name: string) {
  const [firstName, ...rest] = name.trim().split(" ");
  const lastName = rest[rest.length - 1];
  return `${firstName?.charAt(0) || ""}${lastName?.charAt(0) || ""}`.toUpperCase();
}
