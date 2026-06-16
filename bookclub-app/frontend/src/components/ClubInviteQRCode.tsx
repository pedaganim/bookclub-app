import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ShareIcon, ArrowDownTrayIcon, LinkIcon, CheckIcon } from '@heroicons/react/24/outline';

interface ClubInviteQRCodeProps {
  clubId: string;
  slug: string;
  clubName: string;
  className?: string;
}

const ClubInviteQRCode: React.FC<ClubInviteQRCodeProps> = ({ clubId, slug, clubName, className = '' }) => {
  const [copied, setCopied] = React.useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  // Generate the join URL
  const joinUrl = `${window.location.origin}/clubs/${slug}/explore`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const handleDownloadQR = () => {
    if (!qrRef.current) return;
    
    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width + 80;
      canvas.height = img.height + 140;
      if (ctx) {
        // Background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw QR code
        ctx.drawImage(img, 40, 40);
        
        // Add text
        ctx.fillStyle = '#111827'; // gray-900
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`Join ${clubName}`, canvas.width / 2, img.height + 80);
        
        ctx.fillStyle = '#6B7280'; // gray-500
        ctx.font = '16px sans-serif';
        ctx.fillText('Scan to join on Booklub', canvas.width / 2, img.height + 110);

        const pngFile = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.download = `${slug}-qr-code.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      }
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  return (
    <div className={`flex flex-col items-center p-6 bg-white ${className}`}>
      <div className="mb-6 text-center">
        <h3 className="text-xl font-bold text-gray-900 mb-1">Invite to {clubName}</h3>
        <p className="text-sm text-gray-500">Scan this code to visit the club and join.</p>
      </div>

      <div 
        ref={qrRef}
        className="p-6 bg-white rounded-3xl shadow-xl border border-gray-100 mb-8 transform transition-transform hover:scale-105"
      >
        <QRCodeSVG 
          value={joinUrl} 
          size={240}
          level="H"
          includeMargin={false}
          imageSettings={{
            src: "/logo192.png",
            x: undefined,
            y: undefined,
            height: 40,
            width: 40,
            excavate: true,
          }}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 w-full">
        <button
          onClick={handleDownloadQR}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-2xl font-semibold hover:bg-indigo-700 transition-colors shadow-md active:scale-95"
        >
          <ArrowDownTrayIcon className="h-5 w-5" />
          Download
        </button>
        
        <button
          onClick={handleCopyLink}
          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-semibold border-2 transition-all active:scale-95 ${
            copied 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
              : 'bg-white border-gray-100 text-gray-700 hover:border-gray-200 hover:bg-gray-50'
          }`}
        >
          {copied ? (
            <>
              <CheckIcon className="h-5 w-5" />
              Copied!
            </>
          ) : (
            <>
              <LinkIcon className="h-5 w-5" />
              Copy Link
            </>
          )}
        </button>
      </div>

      <div className="mt-8 flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-full text-xs text-gray-500 font-medium border border-gray-100">
        <ShareIcon className="h-3.5 w-3.5" />
        {joinUrl}
      </div>
    </div>
  );
};

export default ClubInviteQRCode;
