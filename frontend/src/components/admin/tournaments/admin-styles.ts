// Clases de botones de la gestión de torneos (mismo lenguaje que el mockup del administrador)
const BASE =
  'inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold no-underline transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#7dffa3] disabled:cursor-not-allowed disabled:border disabled:border-dashed disabled:border-[#f4f8f5]/25 disabled:bg-transparent disabled:text-[#8fa596] disabled:shadow-none [&_svg]:size-4 [&_svg]:shrink-0'

export const BTN_PRIMARY = `${BASE} bg-[#35f46e] font-extrabold text-[#06110b] shadow-[0_10px_24px_rgba(53,244,110,0.22)] hover:bg-[#7dffa3] hover:text-[#06110b] hover:shadow-[0_12px_30px_rgba(53,244,110,0.35)]`
export const BTN_SECONDARY = `${BASE} border border-[#f4f8f5]/20 bg-[#10271a] text-[#f4f8f5] hover:border-[#35f46e] hover:bg-[#143220] hover:text-[#f4f8f5]`
export const BTN_DANGER = `${BASE} border border-[#ff6b6b]/60 bg-[#ff6b6b]/10 text-[#ff9b9b] hover:bg-[#ff6b6b]/20 hover:text-[#ffc2c2]`
export const BTN_AMBER = `${BASE} bg-[#f2c94c] font-extrabold text-[#06110b] hover:bg-[#ffe08a] hover:text-[#06110b]`
export const BTN_ICON = `${BTN_SECONDARY} w-11 px-0`
