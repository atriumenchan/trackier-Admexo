export const DATACENTER_REASON = "Datacenter IP";

/** Hosting and cloud networks. Google's own networks are left out on purpose so ad review traffic is never caught. */
const HOSTING_ASNS = new Set([
  16509, 14618, 8987, // Amazon / AWS
  396982, 19527, // Google Cloud
  14061, // DigitalOcean
  16276, 35540, // OVH
  24940, 213230, // Hetzner
  63949, // Linode / Akamai Cloud
  20473, // Vultr / Choopa
  51167, 40021, // Contabo
  12876, // Scaleway
  31898, // Oracle Cloud
  45102, 37963, // Alibaba Cloud
  132203, // Tencent Cloud
  136907, // Huawei Cloud
  60068, 212238, // Datacamp / CDN77
  9009, // M247
  60781, 28753, 59253, 7203, // Leaseweb
  36352, // ColoCrossing
  8100, // QuadraNet
  54290, // Hostwinds
  47583, // Hostinger
  62240, // Clouvider
  199524, // G-Core
  202425, // IP Volume
  29802, // HIVELOCITY
  46562, // Performive
  53667, // FranTech / BuyVM
]);

const HOSTING_NAMES = new RegExp(
  [
    "amazon", "\\baws\\b", "google cloud", "microsoft azure", "\\bazure\\b", "digitalocean", "\\bovh", "hetzner", "linode", "akamai connected cloud",
    "vultr", "choopa", "the constant company", "contabo", "scaleway", "online s\\.a\\.s", "oracle (cloud|corporation)", "alibaba", "aliyun",
    "tencent cloud", "huawei cloud", "leaseweb", "\\bm247\\b", "datacamp", "cdn77", "colocrossing", "quadranet", "hostwinds", "hostinger",
    "clouvider", "g-core", "gcore", "ip volume", "hivelocity", "performive", "frantech", "buyvm", "kamatera", "psychz", "sharktech",
    "latitude\\.sh", "servers\\.com", "selectel", "timeweb", "aeza", "stark industries", "worldstream", "nforce", "serverion", "zenlayer",
    "packet host", "equinix metal", "ionos", "godaddy", "hosting", "data ?cent(er|re)", "\\bvps\\b", "dedicated server", "colocation",
  ].join("|"),
  "i",
);

export function isDatacenter(network: { isp?: string; org?: string; asn?: number | null }) {
  if (network.asn && HOSTING_ASNS.has(network.asn)) return true;
  const name = `${network.isp || ""} ${network.org || ""}`.trim();
  return Boolean(name) && HOSTING_NAMES.test(name);
}
