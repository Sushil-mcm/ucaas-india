import { getBrandList } from "@/services/api";
import { useQuery } from "@tanstack/react-query";

export const useBrandList = () => {
    const request = useQuery({
        queryKey: ["getBrandList"],
        queryFn: () => getBrandList({}),
        select: (data) => data?.data?.data,
    });

    return request;
};


