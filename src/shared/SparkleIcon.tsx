export function SparkleIcon({ size = 20, gradientId = "sparkle_grad" }: { size?: number; gradientId?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 25.3235 25.3235" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
      <path
        d="M1.92474 2.57717C1.73373 2.22387 2.22383 1.73377 2.57714 1.92477C4.70504 3.07516 8.68339 4.88398 12.6617 4.88398C16.6401 4.88398 20.6184 3.07515 22.7463 1.92474C23.0996 1.73373 23.5897 2.22383 23.3987 2.57714C22.2483 4.70504 20.4395 8.68339 20.4395 12.6617C20.4395 16.6401 22.2484 20.6185 23.3988 22.7464C23.5898 23.0997 23.0997 23.5898 22.7464 23.3988C20.6185 22.2484 16.6401 20.4395 12.6617 20.4395C8.68339 20.4395 4.70504 22.2483 2.57714 23.3988C2.22384 23.5898 1.73374 23.0997 1.92474 22.7464C3.07515 20.6185 4.88398 16.6401 4.88398 12.6617C4.88398 8.68339 3.07515 4.70506 1.92474 2.57717Z"
        stroke={`url(#${gradientId})`}
        strokeWidth="3.75"
      />
      <defs>
        <radialGradient id={gradientId} cx="0" cy="0" r="1"
          gradientTransform="translate(28.8849 2.15998) rotate(126.197) scale(27.4705)"
          gradientUnits="userSpaceOnUse">
          <stop stopColor="#EC6392" />
          <stop offset="0.331731" stopColor="#FA6E68" />
          <stop offset="0.682692" stopColor="#CB6CDA" />
          <stop offset="0.971154" stopColor="#618AFF" />
        </radialGradient>
      </defs>
    </svg>
  );
}
