export type VenueProgrammeItem = Readonly<{
  day: "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
  start: string;
  title: string;
  category: "modelling" | "fashion" | "music" | "dance" | "exhibition" | "rehearsal";
}>;

/** Fictional in-game weekly programme for the Akwaaba Creative Arts Centre. */
export const AKWAABA_VENUE_PROGRAMME: readonly VenueProgrammeItem[] = [
  { day: "monday", start: "10:00", title: "Open modelling practice", category: "modelling" },
  { day: "tuesday", start: "16:00", title: "Model casting and auditions", category: "modelling" },
  { day: "wednesday", start: "18:00", title: "Dance and stage rehearsal", category: "rehearsal" },
  { day: "thursday", start: "17:00", title: "Emerging designers showcase", category: "fashion" },
  { day: "friday", start: "19:00", title: "Ghana fashion runway night", category: "fashion" },
  { day: "saturday", start: "19:30", title: "Live music and creative performances", category: "music" },
  { day: "sunday", start: "15:00", title: "Art, photography and culture exhibition", category: "exhibition" }
];

export function isVenueProgrammeValid(): boolean {
  const days = new Set(AKWAABA_VENUE_PROGRAMME.map((item) => item.day));
  return AKWAABA_VENUE_PROGRAMME.length === 7 &&
    days.size === 7 &&
    AKWAABA_VENUE_PROGRAMME.every((item) =>
      item.title.length > 0 &&
      /^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(item.start)
    );
}
