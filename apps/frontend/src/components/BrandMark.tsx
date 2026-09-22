export const BrandMark = ({
  large = false,
  compact = false,
}: {
  large?: boolean;
  compact?: boolean;
}) => (
  <img
    className={`shrink-0 object-contain ${large ? 'size-28 sm:size-56' : compact ? 'size-10' : 'size-20'}`}
    src="/icons/dhakad-logo.png"
    alt="Dhakad Grading Plant logo"
  />
);
