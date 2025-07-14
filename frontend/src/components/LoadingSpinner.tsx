// A simple loading spinner component, this loading spinner is necessary for UI improvement
const LoadingSpinner = () => {
  return (
    <>
      <div>
        <svg className="loading" viewBox="0 0 32 32">
          <circle cx="16" cy="16" r="14"></circle>
          <circle cx="16" cy="16" r="14"></circle>
        </svg>
      </div>
    </>
  );
};

export default LoadingSpinner;
