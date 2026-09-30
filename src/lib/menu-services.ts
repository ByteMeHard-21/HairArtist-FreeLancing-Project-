import { groomPackage, serviceCategories, services, type Audience, type Service } from "@/data/services";

export const groomServiceId = "groom-package";
export const defaultMenuServices: Service[] = [...services, {
  id: groomServiceId, name: groomPackage.name, category: "Groom package", audiences: ["groom"],
  price: groomPackage.price, status: "confirmed",
}];
export const menuServiceFields = "id,name,category,audiences,price,status,is_custom,is_hidden,sort_order";

export type MenuServiceOverride = {
  id: string;
  name: string;
  category: string;
  audiences: string[];
  price: number | null;
  status: "draft" | "confirmed";
  is_custom: boolean;
  is_hidden: boolean;
  sort_order: number;
};

export type ManagedMenuService = Service & {
  isCustom: boolean;
  isHidden: boolean;
  sortOrder: number;
};

const validAudiences = new Set<Audience>(["men", "women", "children", "groom"]);

function readAudiences(values: string[]) {
  return values.filter((value): value is Audience => validAudiences.has(value as Audience));
}

export function mergeMenuServices(overrides: MenuServiceOverride[] = []): ManagedMenuService[] {
  const catalogue = new Map<string, ManagedMenuService>(
    defaultMenuServices.map((service, index) => [service.id, { ...service, isCustom: false, isHidden: false, sortOrder: index * 10 }]),
  );

  for (const override of overrides) {
    const audiences = readAudiences(override.audiences);
    if (!override.id || !override.name || !override.category || !audiences.length) continue;
    catalogue.set(override.id, {
      id: override.id,
      name: override.name,
      category: override.category,
      audiences,
      price: override.price,
      status: override.status,
      isCustom: override.is_custom,
      isHidden: override.is_hidden,
      sortOrder: override.sort_order,
    });
  }

  return [...catalogue.values()].toSorted((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name));
}

export function menuCategoriesFor(servicesToGroup: Pick<Service, "category">[]) {
  const available = new Set(servicesToGroup.map(service => service.category));
  return [...serviceCategories.filter(category => available.has(category)), ...[...available].filter(category => !serviceCategories.includes(category)).toSorted()];
}
