class ObjectHelper {

    static flattenObject( originalObj ) {
        const newObj = {};
        for ( const key in originalObj ) {
            if ( typeof originalObj[ key ] === 'object' && originalObj[ key ] !== null ) {
                const nestedObj = Utils.flattenObject( originalObj[ key ] );
                for ( const nestedKey in nestedObj ) {
                    newObj[ key + '_' + nestedKey ] = nestedObj[ nestedKey ];
                }
            } else {
                newObj[ key ] = originalObj[ key ];
            }
        }

        return newObj;
    }
    static getType( obj ) {
        return Object.prototype.toString.call( obj ).toLowerCase().slice( 8, -1 );
    }
    static getSha512Hash( text ) {
        let digest = Utilities.computeDigest( Utilities.DigestAlgorithm.SHA_512, text, Utilities.Charset.UTF_8 );

        let hash = '';
        for ( let i = 0; i < digest.length; i++ ) {
            let byte = digest[ i ];
            if ( byte < 0 ) byte += 256;
            let byteHex = byte.toString( 16 );
            if ( byteHex.length == 1 ) byteHex = '0' + byteHex;
            hash += byteHex;
        }
        return hash;
    }
    static deepClone( obj ) {
        function privateDeepClone( obj, visited = new WeakMap() ) {
            if ( typeof obj !== 'object' || obj === null ) {
                return obj;
            }

            if ( obj instanceof Date ) {
                return new Date( obj );
            }

            if ( obj instanceof RegExp ) {
                return new RegExp( obj );
            }

            if ( typeof obj === 'function' ) {
                return obj;
            }

            if ( visited.has( obj ) ) {
                return visited.get( obj );
            }

            if ( Array.isArray( obj ) ) {
                const arrClone = [];
                visited.set( obj, arrClone );
                obj.forEach( ( item, index ) => {
                    arrClone[ index ] = privateDeepClone( item, visited );
                } );
                return arrClone;
            }

            if ( obj instanceof Object ) {
                const objClone = {};
                visited.set( obj, objClone );
                for ( const key in obj ) {
                    if ( Object.prototype.hasOwnProperty.call( obj, key ) ) {
                        objClone[ key ] = privateDeepClone( obj[ key ], visited );
                    }
                }
                return objClone;
            }

            throw new Error( "No se pudo clonar el objeto: su tipo no es soportado." );
        }

        return privateDeepClone( obj );
    }
    static merge( target, ...sources ) {
        sources.forEach( source => {
            if ( typeof source === 'object' && source !== null ) {
                Object.keys( source ).forEach( key => {
                    const sourceValue = source[ key ];
                    const targetValue = target[ key ];

                    if ( typeof sourceValue === 'object' && sourceValue !== null &&
                        typeof targetValue === 'object' && targetValue !== null ) {
                        ObjectHelper.merge( targetValue, sourceValue );
                    } else {
                        target[ key ] = sourceValue;
                    }
                } );
            }
        } );

        return target;
    }
    static mergeCloning( target, ...sources ) {
        sources.forEach( ( source, index ) => {
            let sourceClone = ObjectHelper.deepClone( source );
            if ( typeof sourceClone === 'object' && sourceClone !== null ) {
                Object.keys( sourceClone ).forEach( key => {
                    const sourceValue = sourceClone[ key ];
                    const targetValue = target[ key ];

                    if ( typeof sourceValue === 'object' && sourceValue !== null &&
                        typeof targetValue === 'object' && targetValue !== null ) {
                        ObjectHelper.merge( targetValue, sourceValue );
                    } else {
                        target[ key ] = sourceValue;
                    }
                } );
            }
        } );

        return target;
    }
    static getPropertyByPath( obj, path ) {
        const keys = path.split( '.' );
        let current = obj;

        try {
            for ( const key of keys ) {
                if ( current[ key ] === undefined ) {
                    return undefined;  // O manejar el error como prefieras
                }
                current = current[ key ];
            }
        } catch ( error ) {
            return undefined;
        }

        return current;
    }

}