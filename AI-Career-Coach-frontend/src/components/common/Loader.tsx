export default function Loader({ size = 'md', text }: { size?: 'sm' | 'md' | 'lg'; text?: string }) {
  const s = { sm: 'w-5 h-5', md: 'w-8 h-8', lg: 'w-12 h-12' }[size];
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className={`${s} border-2 border-blue-500 border-t-transparent rounded-full animate-spin`} />
      {text && <p className="text-sm text-gray-400">{text}</p>}
    </div>
  );
}
