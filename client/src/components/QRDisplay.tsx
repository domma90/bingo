interface Props {
  dataUrl: string;
  url: string;
}

export default function QRDisplay({ dataUrl, url }: Props) {
  return (
    <div className="flex flex-col items-center gap-3 p-6 bg-white rounded-2xl shadow-lg border-2 border-raya-gold">
      <p className="text-raya-dark font-semibold text-sm uppercase tracking-wide">
        Scan to join
      </p>
      <img
        src={dataUrl}
        alt="QR Code to join the game"
        className="w-48 h-48 rounded-lg"
      />
      <p className="text-xs text-raya-dark/60 break-all text-center max-w-[200px]">
        {url}
      </p>
    </div>
  );
}
