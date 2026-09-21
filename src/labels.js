export function ticketIdFromEvent(event) {
  return event.ticket?.id ?? event.channelId;
}

export function asLabels(value) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const id = typeof item.id === "string" ? item.id : "";
    const name = typeof item.name === "string" ? item.name : "";
    if (!id || !name) return [];
    return [{ id, name, color: typeof item.color === "string" ? item.color : undefined }];
  });
}

export function isBugLabelName(name) {
  return name.trim().toLowerCase() === "bug";
}

export function addedLabels(fromValue, toValue) {
  const fromIds = new Set(asLabels(fromValue).map((label) => label.id));
  return asLabels(toValue).filter((label) => !fromIds.has(label.id));
}

export function removedLabels(fromValue, toValue) {
  const toIds = new Set(asLabels(toValue).map((label) => label.id));
  return asLabels(fromValue).filter((label) => !toIds.has(label.id));
}

export function ticketHasBugLabel(labels) {
  return asLabels(labels).some((label) => isBugLabelName(label.name));
}

export function bugLabelWasAdded(event) {
  return (
    event.type === "labels_changed" &&
    addedLabels(event.fromValue, event.toValue).some((label) =>
      isBugLabelName(label.name),
    )
  );
}

export function bugLabelWasRemoved(event) {
  return (
    event.type === "labels_changed" &&
    removedLabels(event.fromValue, event.toValue).some((label) =>
      isBugLabelName(label.name),
    )
  );
}
