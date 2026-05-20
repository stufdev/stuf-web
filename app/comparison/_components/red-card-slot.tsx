type RedCardSlotProps = {
  redCards: number;
  align: 'left' | 'right';
};

function RedCardMarker() {
  return <span className="h-4 w-3 rounded-[2px] bg-[#fb7185]" />;
}

export function RedCardSlot({ redCards, align }: RedCardSlotProps) {
  const cardCount = Math.max(0, redCards);

  return (
    <span
      aria-label={cardCount > 0 ? `${cardCount} red card${cardCount === 1 ? '' : 's'}` : undefined}
      className={`inline-flex min-h-4 min-w-8 items-center gap-0.5 ${
        align === 'right' ? 'justify-end' : 'justify-start'
      }`}
    >
      {Array.from({ length: cardCount }).map((_, index) => (
        <RedCardMarker key={`${align}-${cardCount}-${index}`} />
      ))}
    </span>
  );
}
