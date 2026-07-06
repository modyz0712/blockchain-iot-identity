export function shortValue(value?: string | null, head = 10, tail = 6) {
  if (!value) {
    return "Unavailable";
  }

  if (value.length <= head + tail + 3) {
    return value;
  }

  return `${value.slice(0, head)}...${value.slice(-tail)}`;
}

export function revocationModeLabel(mode?: string | null) {
  if (mode === "0") {
    return "Strategy A";
  }

  if (mode === "1") {
    return "Strategy B";
  }

  return "Unknown";
}

export function boolLabel(value: boolean | null | undefined) {
  if (value === true) {
    return "Yes";
  }

  if (value === false) {
    return "No";
  }

  return "Unknown";
}
