import type { Cricketer } from "../types";
import { IPL, L, p, R } from "./helpers";
import { EXTRA_CRICKETERS } from "./players-extra";

export { IPL } from "./helpers";

/**
 * Seed pool of men's cricketers, current and retired.
 *
 * IMPORTANT: `lastIplTeam` changes after every auction / trade window.
 * Values reflect the editor's knowledge as of the 2026 IPL season and should be
 * re-checked after each auction (see TASKS.md T0.5).
 */

const BASE: Cricketer[] = [
  // ---------------- India – current ----------------
  p("virat-kohli", "Virat Kohli", ["King Kohli", "Chiku"], "India", "batter", R, null, IPL.RCB, "current", 5),
  p("rohit-sharma", "Rohit Sharma", ["Hitman", "Ro"], "India", "batter", R, null, IPL.MI, "current", 5),
  p("jasprit-bumrah", "Jasprit Bumrah", ["Jassi", "Boom"], "India", "bowler", R, "right-arm fast", IPL.MI, "current", 5),
  p("hardik-pandya", "Hardik Pandya", ["Kung Fu Pandya"], "India", "allrounder", R, "right-arm fast-medium", IPL.MI, "current", 5),
  p("suryakumar-yadav", "Suryakumar Yadav", ["SKY", "Surya"], "India", "batter", R, null, IPL.MI, "current", 5),
  p("tilak-varma", "Tilak Varma", [], "India", "batter", L, null, IPL.MI, "current", 3),
  p("shubman-gill", "Shubman Gill", ["Prince"], "India", "batter", R, null, IPL.GT, "current", 5),
  p("rishabh-pant", "Rishabh Pant", [], "India", "wicketkeeper", L, null, IPL.LSG, "current", 5),
  p("kl-rahul", "KL Rahul", ["KL"], "India", "wicketkeeper", R, null, IPL.DC, "current", 5),
  p("ravindra-jadeja", "Ravindra Jadeja", ["Jaddu", "Sir Jadeja"], "India", "allrounder", L, "slow left-arm orthodox", IPL.RR, "current", 5),
  p("sanju-samson", "Sanju Samson", [], "India", "wicketkeeper", R, null, IPL.CSK, "current", 4),
  p("ruturaj-gaikwad", "Ruturaj Gaikwad", ["Rutu"], "India", "batter", R, null, IPL.CSK, "current", 4),
  p("shivam-dube", "Shivam Dube", [], "India", "allrounder", L, "right-arm medium", IPL.CSK, "current", 3),
  p("shreyas-iyer", "Shreyas Iyer", [], "India", "batter", R, null, IPL.PBKS, "current", 4),
  p("arshdeep-singh", "Arshdeep Singh", [], "India", "bowler", L, "left-arm fast-medium", IPL.PBKS, "current", 4),
  p("yuzvendra-chahal", "Yuzvendra Chahal", ["Yuzi"], "India", "bowler", R, "right-arm leg-spin", IPL.PBKS, "current", 4),
  p("yashasvi-jaiswal", "Yashasvi Jaiswal", ["Jaisu"], "India", "batter", L, null, IPL.RR, "current", 4),
  p("mohammed-siraj", "Mohammed Siraj", ["Miyan Magic"], "India", "bowler", R, "right-arm fast", IPL.GT, "current", 4),
  p("washington-sundar", "Washington Sundar", ["Washi"], "India", "allrounder", L, "right-arm off-spin", IPL.GT, "current", 3),
  p("mohammed-shami", "Mohammed Shami", [], "India", "bowler", R, "right-arm fast", IPL.LSG, "current", 4),
  p("kuldeep-yadav", "Kuldeep Yadav", ["Kuldeep"], "India", "bowler", L, "left-arm wrist-spin", IPL.DC, "current", 4),
  p("axar-patel", "Axar Patel", ["Bapu"], "India", "allrounder", L, "slow left-arm orthodox", IPL.DC, "current", 4),
  p("abhishek-sharma", "Abhishek Sharma", [], "India", "batter", L, null, IPL.SRH, "current", 4),
  p("ishan-kishan", "Ishan Kishan", [], "India", "wicketkeeper", L, null, IPL.SRH, "current", 3),
  p("rinku-singh", "Rinku Singh", [], "India", "batter", L, null, IPL.KKR, "current", 4),
  p("varun-chakravarthy", "Varun Chakravarthy", [], "India", "bowler", R, "right-arm leg-spin", IPL.KKR, "current", 3),
  p("ajinkya-rahane", "Ajinkya Rahane", ["Jinks"], "India", "batter", R, null, IPL.KKR, "current", 3),
  p("bhuvneshwar-kumar", "Bhuvneshwar Kumar", ["Bhuvi"], "India", "bowler", R, "right-arm medium-fast", IPL.RCB, "current", 4),

  // ---------------- India – retired (international) ----------------
  p("ms-dhoni", "MS Dhoni", ["MSD", "Mahi", "Thala", "Captain Cool"], "India", "wicketkeeper", R, null, IPL.CSK, "retired", 5),
  p("sachin-tendulkar", "Sachin Tendulkar", ["Master Blaster", "Little Master"], "India", "batter", R, null, IPL.MI, "retired", 5),
  p("sourav-ganguly", "Sourav Ganguly", ["Dada", "Prince of Kolkata"], "India", "batter", L, null, IPL.PUNE, "retired", 5),
  p("rahul-dravid", "Rahul Dravid", ["The Wall", "Jammy"], "India", "batter", R, null, IPL.RR, "retired", 5),
  p("virender-sehwag", "Virender Sehwag", ["Viru"], "India", "batter", R, null, IPL.PBKS, "retired", 5),
  p("yuvraj-singh", "Yuvraj Singh", ["Yuvi"], "India", "allrounder", L, "slow left-arm orthodox", IPL.MI, "retired", 5),
  p("zaheer-khan", "Zaheer Khan", ["Zak"], "India", "bowler", R, "left-arm fast-medium", IPL.DC, "retired", 4),
  p("anil-kumble", "Anil Kumble", ["Jumbo"], "India", "bowler", R, "right-arm leg-spin", IPL.RCB, "retired", 5),
  p("harbhajan-singh", "Harbhajan Singh", ["Bhajji", "Turbanator"], "India", "bowler", R, "right-arm off-spin", IPL.KKR, "retired", 5),
  p("suresh-raina", "Suresh Raina", ["Chinna Thala", "Mr IPL"], "India", "batter", L, null, IPL.CSK, "retired", 5),
  p("gautam-gambhir", "Gautam Gambhir", ["Gauti"], "India", "batter", L, null, IPL.DC, "retired", 4),
  p("shikhar-dhawan", "Shikhar Dhawan", ["Gabbar"], "India", "batter", L, null, IPL.PBKS, "retired", 4),
  p("dinesh-karthik", "Dinesh Karthik", ["DK"], "India", "wicketkeeper", R, null, IPL.RCB, "retired", 4),
  p("ravichandran-ashwin", "Ravichandran Ashwin", ["Ash"], "India", "bowler", R, "right-arm off-spin", IPL.CSK, "retired", 5),
  p("ambati-rayudu", "Ambati Rayudu", [], "India", "batter", R, null, IPL.CSK, "retired", 3),
  p("cheteshwar-pujara", "Cheteshwar Pujara", ["Pujji"], "India", "batter", R, null, IPL.CSK, "retired", 4),
  p("wriddhiman-saha", "Wriddhiman Saha", [], "India", "wicketkeeper", R, null, IPL.GT, "retired", 3),
  p("piyush-chawla", "Piyush Chawla", [], "India", "bowler", L, "right-arm leg-spin", IPL.MI, "retired", 3),
  p("kapil-dev", "Kapil Dev", ["Haryana Hurricane"], "India", "allrounder", R, "right-arm fast-medium", null, "retired", 5),
  p("sunil-gavaskar", "Sunil Gavaskar", ["Sunny", "Little Master"], "India", "batter", R, null, null, "retired", 5),

  // ---------------- Australia ----------------
  p("pat-cummins", "Pat Cummins", [], "Australia", "bowler", R, "right-arm fast", IPL.SRH, "current", 5),
  p("travis-head", "Travis Head", ["Heady"], "Australia", "batter", L, null, IPL.SRH, "current", 5),
  p("mitchell-starc", "Mitchell Starc", [], "Australia", "bowler", L, "left-arm fast", IPL.DC, "current", 5),
  p("josh-hazlewood", "Josh Hazlewood", ["Hoff"], "Australia", "bowler", L, "right-arm fast-medium", IPL.RCB, "current", 4),
  p("mitchell-marsh", "Mitchell Marsh", ["Bison"], "Australia", "allrounder", R, "right-arm medium-fast", IPL.LSG, "current", 4),
  p("cameron-green", "Cameron Green", [], "Australia", "allrounder", R, "right-arm fast-medium", IPL.KKR, "current", 4),
  p("glenn-maxwell", "Glenn Maxwell", ["Maxi", "Big Show"], "Australia", "allrounder", R, "right-arm off-spin", IPL.PBKS, "current", 5),
  p("steve-smith", "Steve Smith", ["Smudge"], "Australia", "batter", R, null, IPL.DC, "current", 5),
  p("marnus-labuschagne", "Marnus Labuschagne", [], "Australia", "batter", R, null, null, "current", 3),
  p("nathan-lyon", "Nathan Lyon", ["Garry"], "Australia", "bowler", R, "right-arm off-spin", null, "current", 4),
  p("david-warner", "David Warner", ["Bull"], "Australia", "batter", L, null, IPL.DC, "retired", 5),
  p("shane-warne", "Shane Warne", ["Warnie"], "Australia", "bowler", R, "right-arm leg-spin", IPL.RR, "retired", 5),
  p("ricky-ponting", "Ricky Ponting", ["Punter"], "Australia", "batter", R, null, IPL.MI, "retired", 5),
  p("adam-gilchrist", "Adam Gilchrist", ["Gilly"], "Australia", "wicketkeeper", L, null, IPL.PBKS, "retired", 5),
  p("matthew-hayden", "Matthew Hayden", ["Haydos"], "Australia", "batter", L, null, IPL.CSK, "retired", 4),
  p("shane-watson", "Shane Watson", ["Watto"], "Australia", "allrounder", R, "right-arm fast-medium", IPL.CSK, "retired", 4),
  p("brett-lee", "Brett Lee", ["Binga"], "Australia", "bowler", R, "right-arm fast", IPL.KKR, "retired", 4),
  p("glenn-mcgrath", "Glenn McGrath", ["Pigeon"], "Australia", "bowler", R, "right-arm fast-medium", IPL.DC, "retired", 4),

  // ---------------- England ----------------
  p("jos-buttler", "Jos Buttler", [], "England", "wicketkeeper", R, null, IPL.GT, "current", 5),
  p("jofra-archer", "Jofra Archer", [], "England", "bowler", R, "right-arm fast", IPL.RR, "current", 4),
  p("phil-salt", "Phil Salt", [], "England", "wicketkeeper", R, null, IPL.RCB, "current", 4),
  p("sam-curran", "Sam Curran", [], "England", "allrounder", L, "left-arm medium-fast", IPL.RR, "current", 4),
  p("joe-root", "Joe Root", ["Rooty"], "England", "batter", R, null, IPL.RR, "current", 5),
  p("ben-stokes", "Ben Stokes", ["Stokesy"], "England", "allrounder", L, "right-arm fast-medium", IPL.CSK, "current", 5),
  p("eoin-morgan", "Eoin Morgan", ["Moggy"], "England", "batter", L, null, IPL.KKR, "retired", 4),
  p("andrew-flintoff", "Andrew Flintoff", ["Freddie"], "England", "allrounder", R, "right-arm fast", IPL.CSK, "retired", 4),
  p("james-anderson", "James Anderson", ["Jimmy", "Burnley Express"], "England", "bowler", L, "right-arm fast-medium", null, "retired", 5),
  p("stuart-broad", "Stuart Broad", ["Broady"], "England", "bowler", L, "right-arm fast-medium", null, "retired", 4),

  // ---------------- South Africa ----------------
  p("kagiso-rabada", "Kagiso Rabada", ["KG"], "South Africa", "bowler", L, "right-arm fast", IPL.GT, "current", 4),
  p("heinrich-klaasen", "Heinrich Klaasen", [], "South Africa", "wicketkeeper", R, null, IPL.SRH, "current", 4),
  p("aiden-markram", "Aiden Markram", [], "South Africa", "batter", R, null, IPL.LSG, "current", 3),
  p("ab-de-villiers", "AB de Villiers", ["ABD", "Mr 360"], "South Africa", "batter", R, null, IPL.RCB, "retired", 5),
  p("faf-du-plessis", "Faf du Plessis", ["Faf"], "South Africa", "batter", R, null, IPL.DC, "retired", 4),
  p("dale-steyn", "Dale Steyn", ["Steyn Gun"], "South Africa", "bowler", R, "right-arm fast", IPL.RCB, "retired", 5),
  p("jacques-kallis", "Jacques Kallis", [], "South Africa", "allrounder", R, "right-arm fast-medium", IPL.KKR, "retired", 5),

  // ---------------- New Zealand ----------------
  p("kane-williamson", "Kane Williamson", ["Kane"], "New Zealand", "batter", R, null, IPL.GT, "current", 5),
  p("trent-boult", "Trent Boult", [], "New Zealand", "bowler", R, "left-arm fast-medium", IPL.MI, "current", 4),
  p("mitchell-santner", "Mitchell Santner", [], "New Zealand", "allrounder", L, "slow left-arm orthodox", IPL.MI, "current", 3),
  p("brendon-mccullum", "Brendon McCullum", ["Baz"], "New Zealand", "wicketkeeper", R, null, IPL.RCB, "retired", 5),
  p("ross-taylor", "Ross Taylor", [], "New Zealand", "batter", R, null, IPL.DC, "retired", 3),

  // ---------------- West Indies ----------------
  p("sunil-narine", "Sunil Narine", [], "West Indies", "allrounder", L, "right-arm off-spin", IPL.KKR, "current", 4),
  p("shimron-hetmyer", "Shimron Hetmyer", [], "West Indies", "batter", L, null, IPL.RR, "current", 3),
  p("nicholas-pooran", "Nicholas Pooran", [], "West Indies", "wicketkeeper", L, null, IPL.LSG, "retired", 4),
  p("andre-russell", "Andre Russell", ["Dre Russ", "Muscle Russell"], "West Indies", "allrounder", R, "right-arm fast", IPL.KKR, "retired", 5),
  p("chris-gayle", "Chris Gayle", ["Universe Boss"], "West Indies", "batter", L, null, IPL.PBKS, "retired", 5),
  p("kieron-pollard", "Kieron Pollard", ["Polly"], "West Indies", "allrounder", R, "right-arm medium", IPL.MI, "retired", 5),
  p("dwayne-bravo", "Dwayne Bravo", ["DJ Bravo", "Champion"], "West Indies", "allrounder", R, "right-arm medium-fast", IPL.CSK, "retired", 5),
  p("brian-lara", "Brian Lara", ["Prince of Trinidad"], "West Indies", "batter", L, null, null, "retired", 5),

  // ---------------- Pakistan ----------------
  p("babar-azam", "Babar Azam", [], "Pakistan", "batter", R, null, null, "current", 5),
  p("shaheen-afridi", "Shaheen Shah Afridi", ["Shaheen"], "Pakistan", "bowler", L, "left-arm fast", null, "current", 4),
  p("mohammad-rizwan", "Mohammad Rizwan", ["Rizi"], "Pakistan", "wicketkeeper", R, null, null, "current", 4),
  p("shoaib-akhtar", "Shoaib Akhtar", ["Rawalpindi Express"], "Pakistan", "bowler", R, "right-arm fast", IPL.KKR, "retired", 5),
  p("shahid-afridi", "Shahid Afridi", ["Boom Boom Afridi", "Lala"], "Pakistan", "allrounder", R, "right-arm leg-spin", IPL.DECCAN, "retired", 5),
  p("wasim-akram", "Wasim Akram", ["Sultan of Swing"], "Pakistan", "bowler", L, "left-arm fast", null, "retired", 5),

  // ---------------- Sri Lanka ----------------
  p("lasith-malinga", "Lasith Malinga", ["Slinga Malinga", "Mali"], "Sri Lanka", "bowler", R, "right-arm fast", IPL.MI, "retired", 5),
  p("kumar-sangakkara", "Kumar Sangakkara", ["Sanga"], "Sri Lanka", "wicketkeeper", L, null, IPL.SRH, "retired", 5),
  p("mahela-jayawardene", "Mahela Jayawardene", ["MJ"], "Sri Lanka", "batter", R, null, IPL.DC, "retired", 4),
  p("muttiah-muralitharan", "Muttiah Muralitharan", ["Murali"], "Sri Lanka", "bowler", R, "right-arm off-spin", IPL.RCB, "retired", 5),
  p("sanath-jayasuriya", "Sanath Jayasuriya", ["Jaya"], "Sri Lanka", "allrounder", L, "slow left-arm orthodox", IPL.MI, "retired", 4),

  // ---------------- Afghanistan ----------------
  p("rashid-khan", "Rashid Khan", [], "Afghanistan", "bowler", R, "right-arm leg-spin", IPL.GT, "current", 5),
  p("noor-ahmad", "Noor Ahmad", [], "Afghanistan", "bowler", R, "left-arm wrist-spin", IPL.CSK, "current", 3),
  p("mohammad-nabi", "Mohammad Nabi", [], "Afghanistan", "allrounder", R, "right-arm off-spin", IPL.MI, "current", 3),

  // ---------------- Bangladesh ----------------
  p("shakib-al-hasan", "Shakib Al Hasan", [], "Bangladesh", "allrounder", L, "slow left-arm orthodox", IPL.KKR, "retired", 4),
  p("mustafizur-rahman", "Mustafizur Rahman", ["Fizz"], "Bangladesh", "bowler", L, "left-arm fast-medium", IPL.DC, "current", 3),
  p("tamim-iqbal", "Tamim Iqbal", [], "Bangladesh", "batter", L, null, null, "retired", 3),
];

export const CRICKETERS: Cricketer[] = [...BASE, ...EXTRA_CRICKETERS];

export const CRICKETERS_BY_ID: ReadonlyMap<string, Cricketer> = new Map(CRICKETERS.map((c) => [c.id, c]));

export function getCricketer(id: string): Cricketer {
  const c = CRICKETERS_BY_ID.get(id);
  if (!c) throw new Error(`Unknown cricketer: ${id}`);
  return c;
}
