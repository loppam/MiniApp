"use client";

import { useState } from "react";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";

interface ProfileImageProps {
  src?: string | null;
  alt?: string;
  size?: number;
  className?: string;
  fallbackText?: string;
}

export function ProfileImage({
  src,
  alt = "Profile",
  size = 24,
  className = "",
  fallbackText = "?",
}: ProfileImageProps) {
  const [hasError, setHasError] = useState(false);

  // If no src or error occurred, show fallback
  if (!src || hasError) {
    return (
      <Avatar className={`w-${size} h-${size} ${className}`}>
        <AvatarFallback className="text-xs bg-gray-200 text-gray-600">
          {fallbackText}
        </AvatarFallback>
      </Avatar>
    );
  }

  // Check if it's a Farcaster image URL
  const isFarcasterImage = src.includes("imagedelivery.net");

  return (
    <Avatar className={`w-${size} h-${size} ${className}`}>
      <AvatarImage
        src={src}
        alt={alt}
        onError={() => setHasError(true)}
        className="object-cover"
      />
      <AvatarFallback className="text-xs bg-gray-200 text-gray-600">
        {fallbackText}
      </AvatarFallback>
    </Avatar>
  );
}

// Alternative version using regular Image component for more control
export function ProfileImageSimple({
  src,
  alt = "Profile",
  size = 24,
  className = "",
  fallbackText = "?",
}: ProfileImageProps) {
  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    setHasError(true);
  };

  // If no src or error occurred, show fallback
  if (!src || hasError) {
    return (
      <div
        className={`w-${size} h-${size} rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-600 ${className}`}
      >
        {fallbackText}
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={`rounded-full object-cover ${className}`}
      unoptimized={src.includes("imagedelivery.net")}
      onError={handleError}
    />
  );
}
