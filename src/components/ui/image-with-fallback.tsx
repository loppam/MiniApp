import React, { useState } from "react";
import Image from "next/image";

const ERROR_IMG_SRC =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4KCg==";

export function ImageWithFallback(
  props: React.ImgHTMLAttributes<HTMLImageElement>
) {
  const [didError, setDidError] = useState(false);

  const handleError = () => {
    setDidError(true);
  };

  const {
    src,
    alt,
    style,
    className,
    width = 88,
    height = 88,
    ...rest
  } = props;

  if (didError) {
    return (
      <div
        className={`inline-block bg-gray-100 text-center align-middle ${
          className ?? ""
        }`}
        style={style}
      >
        <div className="flex items-center justify-center w-full h-full">
          <Image
            src={ERROR_IMG_SRC}
            alt="Error loading image"
            width={Number(width)}
            height={Number(height)}
            {...rest}
            data-original-url={src}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "relative",
        width: Number(width),
        height: Number(height),
      }}
    >
      <Image
        src={src || ""}
        alt={alt || ""}
        className={className}
        style={style}
        width={Number(width)}
        height={Number(height)}
        {...rest}
        onError={handleError}
        unoptimized
      />
    </div>
  );
}
