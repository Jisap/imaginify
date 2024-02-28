import Header from "@/components/Shared/Header"
import { transformationTypes } from "@/constants"




const AddTransformationTypePage = ({params: { type }}: SearchParamProps) => { // Se llega a esta página desde el sidebar con cada Link.route

  const transformation = transformationTypes[type];

  return (
    <Header
      title={transformation.title}
      subtitle={transformation.subTitle}
    />
  )
}

export default AddTransformationTypePage