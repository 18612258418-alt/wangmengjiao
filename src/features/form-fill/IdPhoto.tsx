import idPhotoImg from "../../assets/id-photo-default.png";

/** 一寸照片标准：25mm × 35mm（宽 × 高） */
export const ID_PHOTO_WIDTH_PX = 90;
export const ID_PHOTO_HEIGHT_PX = 126;

interface IdPhotoProps {
  className?: string;
}

/** 表单内联展示用一寸照片 */
export function IdPhoto({ className = "" }: IdPhotoProps) {
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <img
        src={idPhotoImg}
        alt="一寸照片"
        width={ID_PHOTO_WIDTH_PX}
        height={ID_PHOTO_HEIGHT_PX}
        className="object-cover object-top rounded-sm select-none pointer-events-none"
        style={{ width: ID_PHOTO_WIDTH_PX, height: ID_PHOTO_HEIGHT_PX }}
        draggable={false}
      />
    </div>
  );
}
