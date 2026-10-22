export const BrandMark = ({
  large = false,
  compact = false,
}: {
  large?: boolean;
  compact?: boolean;
}) => (
  <img
    className={`shrink-0 object-contain ${large ? 'size-28 sm:size-56' : compact ? 'size-10' : 'size-20'}`}
    src={`${import.meta.env.BASE_URL}icons/${compact ? 'grading-plant-solution-mark.svg' : 'grading-plant-solution-logo.svg'}`}
    alt="Grading Plant Solution logo, call 9669024735"
  />
);
