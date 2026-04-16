import React from 'react';

const LOGOS = {
  cream: 'https://habitbeaver.s3.us-west-1.amazonaws.com/Logos/Check+Black.png',
  white: 'https://habitbeaver.s3.us-west-1.amazonaws.com/Logos/Check+Green.png',
  dark: 'https://habitbeaver.s3.us-west-1.amazonaws.com/Logos/Check+White.png',
};

export default function CheckLogo({ size = 26 }) {
  return (
    <>
      {Object.entries(LOGOS).map(([theme, src]) => (
        <img
          key={theme}
          src={src}
          alt="Done"
          className={`logo-${theme}`}
          style={{ width: `${size}px`, height: `${size}px`, objectFit: 'contain' }}
        />
      ))}
    </>
  );
}
