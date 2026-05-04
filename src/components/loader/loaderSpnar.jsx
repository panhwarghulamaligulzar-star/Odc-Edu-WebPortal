

import { ScaleLoader } from "react-spinners";

const LoaderSpnar = ({ color = "#01134C", className = "" }) => {
  return (
    <div style={{ display: "flex", justifyContent: "center" }} className={className}>
      <ScaleLoader
        color={color}
        height={26}
        width={4}
        radius={2}
        margin={2}
        loading={true}
      />
    </div>
  );
};

export default LoaderSpnar;
