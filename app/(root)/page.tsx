
import { Collection } from "@/components/Shared/Collection"
import { navLinks } from "@/constants"
import { getAllImages } from "@/lib/actions/image.action"
import Image from "next/image"
import Link from "next/link"



const Home = async({ searchParams }: SearchParamProps) => {

  const page = Number(searchParams?.page) || 1;               // Param con la key=page
  const searchQuery = (searchParams?.query as string) || '';  // Param con la key=query

  const images = await getAllImages({ page, searchQuery });   // Busqueda segun página y query

  return (
    <>
      <section className="home">
        <h1 className="home-heading">
          Unleash Your Creative Vision with Imaginify
        </h1>
        <ul className="flex-center w-full gap-20">
          {navLinks.slice(1, 5).map((link) => ( // Saltamos el 0 que es home
            <Link
              key={link.route}
              href={link.route}
              className="flex-center flex-col gap-2"
            >
              <li className="flex-center w-fit rounded-full bg-white p-4">
                <Image 
                  src={link.icon} 
                  alt="image" 
                  width={24} 
                  height={24} 
                />
              </li>
              <p className="p-14-medium text-center text-white">{link.label}</p>
            </Link>
          ))}
        </ul>
      </section>

      <section className="sm:mt-12">
        <Collection
          hasSearch={true}
          images={images?.data}
          totalPages={images?.totalPage}
          page={page}
        />
      </section>
    </>
  )
}

export default Home