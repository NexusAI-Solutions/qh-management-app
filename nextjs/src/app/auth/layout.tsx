import Image from "next/image";

export default function AuthLayout({
                                       children,
                                   }: {
    children: React.ReactNode;
}) {
    const productName = process.env.NEXT_PUBLIC_PRODUCTNAME;
  
    return (
        <div className="flex min-h-screen">
            <div className="w-full lg:w-1/2 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-white relative">

                <div className="sm:mx-auto sm:w-full sm:max-w-md">
                    <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900">
                        {productName}
                    </h2>
                </div>

                <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                    {children}
                </div>
            </div>

            <div className="hidden lg:flex lg:w-1/2 bg-backgroundSecondary">
                <div className="w-full flex items-center justify-center p-12">
                    <div className="space-y-6 max-w-lg">
                        <h3 className="text-white text-2xl font-bold mb-8">
                            Sponsored by Nexus AI
                        </h3>
                       
                        <div className="mt-8 text-center">
                            <p className="text-primary-100 text-sm">
                                Speciaal gemaakt voor {productName}
                            </p>
                            <Image
                                src="/331777d9e2a04a46bf61b1f6082a8ddc.png"
                                alt="Lijkzak"
                                width={300}
                                height={300}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}