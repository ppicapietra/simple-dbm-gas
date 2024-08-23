class Str {
	static get _irregularNouns() {
		return {
			"potato": "potatoes",
			"child": "children",
			"tooth": "teeth",
			"mouse": "mice",
			"woman": "women",
			"man": "men",
			"foot": "feet",
			"goose": "geese",
			"ox": "oxen",
			"cow": "cows",
			"leaf": "leaves",
			"knife": "knives",
			"wife": "wives",
			"half": "halves",
			"shelf": "shelves",
			"self": "selves",
			"wolf": "wolves",
			"calf": "calves",
			"loaf": "loaves",
			"thief": "thieves",
			"life": "lives",
			"datum": "data",
			"medium": "media",
			"phenomenon": "phenomena",
			"crisis": "crises",
			"basis": "bases",
			"oasis": "oases",
			"hypothesis": "hypotheses",
			"analysis": "analyses",
			"thesis": "theses",
			"curriculum": "curricula",
			"stimulus": "stimuli",
			"alumna": "alumnae",
			"alumnus": "alumni",
			"barracks": "barracks",
			"species": "species",
			"series": "series",
			"cattle": "cattle",
			"police": "police",
			"dice": "dice",
			"sheep": "sheep",
			"aircraft": "aircraft",
			"offspring": "offspring",
			"spacecraft": "spacecraft",
			"headquarters": "headquarters",
			"means": "means",
			"news": "news",
			"math": "math",
			"economics": "economics",
			"mathematics": "mathematics",
			"physics": "physics",
			"civics": "civics",
			"measles": "measles",
			"mumps": "mumps",
			"gumbo": "gumbo",
			"graffiti": "graffiti",
			"spaghetti": "spaghetti",
			"macaroni": "macaroni",
			"confetti": "confetti",
			"agenda": "agendas",
			"stapler": "staplers",
			"media": "media", // also singular
			"data": "data", // also singular
		}
	}

	static pluralize( word ) {
		// Check for irregular plurals
		if ( word in Str._irregularNouns ) {
			return Str._irregularNouns[ word ];
		}

		// Apply regular pluralization rules
		if ( word.endsWith( 's' ) || word.endsWith( 'x' ) || word.endsWith( 'ch' ) || word.endsWith( 'sh' ) ) {
			return word + 'es';
		} else if ( word.endsWith( 'y' ) ) {
			return word.slice( 0, -1 ) + 'ies';
		} else {
			return word + 's';
		}
	}

	static singularize( word ) {
		// Check if the word is in the irregular plurals list
		if ( word in Str._irregularNouns.hasOwnProperty ) {
			return Str._irregularNouns[ word ];
		}

		// Handle regular plural forms (e.g., removing 's' or 'es')
		if ( word.endsWith( 'es' ) ) {
			return word.slice( 0, -2 ); // Remove 'es'
		} else if ( word.endsWith( 's' ) ) {
			return word.slice( 0, -1 ); // Remove 's'
		}

		// If no match is found, return the original word
		return word;
	}

}