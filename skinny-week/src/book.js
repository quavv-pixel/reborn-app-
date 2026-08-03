// Recipe index — titles and page numbers only.
//
// The recipes themselves live in your own copy of Trust The Skinny Chef. What's
// here is a pointer (title + page) plus the plain grocery search terms needed to
// build a cart. No measurements, no method, no instructions — those stay in the
// book. `items` are shopping terms, not a recipe: they're what you'd type into a
// store's search box, in no particular order and with no quantities.

export const BOOK = [
  { t: "Chipotle Chicken Burrito", p: 118, tag: "chicken", items: ["chicken breast", "flour tortillas", "white rice", "black beans", "shredded cheddar cheese", "chipotle peppers in adobo", "plain greek yogurt", "limes", "cilantro"] },
  { t: "Buffalo Chicken & Rice Burrito", p: 116, tag: "chicken", items: ["chicken breast", "flour tortillas", "white rice", "buffalo wing sauce", "shredded cheddar cheese", "plain greek yogurt", "ranch seasoning"] },
  { t: "Chicken Bacon Ranch Pasta", p: 44, tag: "chicken", items: ["chicken breast", "penne pasta", "bacon", "ranch seasoning", "plain greek yogurt", "shredded mozzarella cheese", "garlic", "chicken broth"] },
  { t: "Buffalo Chicken Mac & Cheese", p: 52, tag: "chicken", items: ["chicken breast", "elbow macaroni", "buffalo wing sauce", "shredded cheddar cheese", "plain greek yogurt", "milk", "cornstarch"] },
  { t: "Creamy Taco Pasta", p: 49, tag: "beef", items: ["ground beef", "penne pasta", "taco seasoning", "shredded cheddar cheese", "plain greek yogurt", "diced tomatoes with green chilies", "yellow onion"] },
  { t: "Loaded Taco Potato Bowls", p: 90, tag: "beef", items: ["ground beef", "russet potatoes", "taco seasoning", "shredded cheddar cheese", "plain greek yogurt", "salsa", "green onions"] },
  { t: "Chicken Enchiladas", p: 128, tag: "chicken", items: ["chicken breast", "corn tortillas", "enchilada sauce", "shredded cheddar cheese", "plain greek yogurt", "yellow onion", "green chiles"] },
  { t: "Cajun Chicken Pasta", p: 41, tag: "chicken", items: ["chicken breast", "penne pasta", "cajun seasoning", "bell peppers", "yellow onion", "heavy cream", "parmesan cheese"] },
  { t: "Marry Me Chicken Pasta", p: 46, tag: "chicken", items: ["chicken breast", "penne pasta", "sun dried tomatoes", "heavy cream", "parmesan cheese", "garlic", "spinach", "chicken broth"] },
  { t: "Protein Mac & Cheese", p: 51, tag: "meatless", items: ["elbow macaroni", "cottage cheese", "shredded cheddar cheese", "milk", "cornstarch", "dijon mustard"] },
  { t: "Chicken Bacon Ranch Burrito", p: 110, tag: "chicken", items: ["chicken breast", "flour tortillas", "bacon", "ranch seasoning", "shredded cheddar cheese", "plain greek yogurt"] },
  { t: "Cheesy Beef Burrito", p: 121, tag: "beef", items: ["ground beef", "flour tortillas", "taco seasoning", "shredded cheddar cheese", "refried beans", "salsa"] },
  { t: "Korean Beef Burritos", p: 113, tag: "beef", items: ["ground beef", "flour tortillas", "white rice", "soy sauce", "brown sugar", "sesame oil", "garlic", "green onions", "sriracha"] },
  { t: "Buffalo Chicken Wings", p: 92, tag: "chicken", items: ["chicken wings", "buffalo wing sauce", "garlic powder", "baking powder", "celery"] },
  { t: "Honey BBQ Chicken Mac & Cheese", p: 59, tag: "chicken", items: ["chicken breast", "elbow macaroni", "bbq sauce", "honey", "shredded cheddar cheese", "milk"] },
  { t: "Garlic Butter Steak and Potatoes", p: 89, tag: "beef", items: ["sirloin steak", "baby potatoes", "butter", "garlic", "rosemary", "olive oil"] },
  { t: "Chicken Smash Burger", p: 74, tag: "chicken", items: ["ground chicken", "hamburger buns", "american cheese", "yellow onion", "dill pickles", "light mayo"] },
  { t: "Double Cheeseburger", p: 76, tag: "beef", items: ["ground beef", "hamburger buns", "american cheese", "yellow onion", "dill pickles", "ketchup", "yellow mustard"] },
  { t: "Chick-fil-A Chicken Sandwich", p: 79, tag: "chicken", items: ["chicken breast", "hamburger buns", "dill pickles", "all purpose flour", "paprika", "powdered sugar", "eggs"] },
  { t: "Nashville Hot Chicken Tenders", p: 94, tag: "chicken", items: ["chicken tenderloins", "all purpose flour", "cayenne pepper", "paprika", "brown sugar", "eggs", "hot sauce"] },
  { t: "Stuffed-Crust BBQ Chicken Pizza", p: 65, tag: "chicken", items: ["chicken breast", "pizza dough", "bbq sauce", "string cheese", "shredded mozzarella cheese", "red onion", "cilantro"] },
  { t: "BBQ Chicken Flatbread", p: 69, tag: "chicken", items: ["chicken breast", "flatbread", "bbq sauce", "shredded mozzarella cheese", "red onion"] },
  { t: "Buffalo Chicken Tacos", p: 102, tag: "chicken", items: ["chicken breast", "corn tortillas", "buffalo wing sauce", "shredded cheddar cheese", "plain greek yogurt", "coleslaw mix"] },
  { t: "Chipotle Steak Quesadilla", p: 132, tag: "beef", items: ["sirloin steak", "flour tortillas", "chipotle peppers in adobo", "shredded cheddar cheese", "bell peppers", "yellow onion"] },
  { t: "Crunch Wrap Supreme", p: 108, tag: "beef", items: ["ground beef", "flour tortillas", "tostada shells", "taco seasoning", "shredded cheddar cheese", "plain greek yogurt", "lettuce", "tomatoes", "nacho cheese sauce"] },
  { t: "Turkey Burrito", p: 124, tag: "turkey", items: ["ground turkey", "flour tortillas", "white rice", "black beans", "taco seasoning", "shredded cheddar cheese", "salsa"] },
  { t: "Teriyaki Chicken Tenders", p: 100, tag: "chicken", items: ["chicken tenderloins", "soy sauce", "brown sugar", "garlic", "ginger", "cornstarch", "sesame seeds", "white rice"] },
  { t: "Chicken Parmesan Sandwich", p: 87, tag: "chicken", items: ["chicken breast", "hoagie rolls", "marinara sauce", "shredded mozzarella cheese", "parmesan cheese", "breadcrumbs", "eggs"] },
  { t: "Pesto Chicken Pasta", p: 50, tag: "chicken", items: ["chicken breast", "penne pasta", "pesto", "cherry tomatoes", "parmesan cheese", "spinach"] },
  { t: "Buffalo Chicken Dip", p: 135, tag: "chicken", items: ["chicken breast", "buffalo wing sauce", "cream cheese", "plain greek yogurt", "shredded cheddar cheese", "ranch seasoning", "tortilla chips"] },
];
