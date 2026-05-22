import React from 'react';
import '../index.css';

export const metadata = {
  title: 'URL UNO',
  description: 'An elegant, web-themed UNO card game based on web protocols and URLs, featuring interactive bots, custom URL deck generation, and standard UNO rules.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-slate-950 text-slate-100 font-sans">
        {children}
      </body>
    </html>
  );
}
