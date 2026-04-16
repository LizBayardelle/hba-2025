import React from 'react';

const LOGOS = {
  cream: 'https://habitbeaver.s3.us-west-1.amazonaws.com/Logos/Beaver+Black.png',
  white: 'https://habitbeaver.s3.us-west-1.amazonaws.com/Logos/Beaver+Brown.png',
  dark: 'https://habitbeaver.s3.us-west-1.amazonaws.com/Logos/Beaver+White.png',
};

export default function BeaverLogo({ size = 26 }) {
  return (
    <>
      {Object.entries(LOGOS).map(([theme, src]) => (
        <img
          key={theme}
          src={src}
          alt="Habit Beaver"
          className={`logo-${theme}`}
          style={{ width: `${size}px`, height: `${size}px`, objectFit: 'contain' }}
        />
      ))}
    </>
  );
}
