/** Inline credit cost chip: [ⓒ 5] */
export function CreditCost({ amount }: { amount: string | number }) {
  return (
    <span
      className='inline-flex items-center gap-1 ml-2 px-2 py-1 rounded-full text-[11px] font-medium leading-none whitespace-nowrap'
      style={{
        backgroundColor: 'rgba(255,255,255,0.15)',
        color: 'rgba(255,255,255,0.85)',
      }}
    >
      <span
        className='inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-[8px] font-bold leading-none'
        style={{
          backgroundColor: 'rgba(255,255,255,0.25)',
        }}
      >
        c
      </span>
      {amount}
    </span>
  );
}
