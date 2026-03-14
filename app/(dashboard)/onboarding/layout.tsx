import Script from 'next/script';

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="stylesheet" href="/webflow-assets/css/normalize.css" />
      <link rel="stylesheet" href="/webflow-assets/css/webflow.css" />
      <link rel="stylesheet" href="/webflow-assets/css/posties.webflow.css" />
      <Script src="https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js" strategy="beforeInteractive" />
      <Script id="webflow-fonts" strategy="beforeInteractive">
        {`WebFont.load({ google: { families: ["Figtree:300,400,500,600,700"] } });`}
      </Script>
      <Script id="webflow-flags" strategy="beforeInteractive">
        {`!function(o,c){var n=c.documentElement,t=" w-mod-";n.className+=t+"js",("ontouchstart"in o||o.DocumentTouch&&c instanceof DocumentTouch)&&(n.className+=t+"touch")}(window,document);`}
      </Script>
      {children}
    </>
  );
}
