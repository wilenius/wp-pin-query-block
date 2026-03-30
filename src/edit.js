import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	RangeControl,
	TextControl,
	Button,
	Spinner,
	Icon,
} from '@wordpress/components';
import { useState, useCallback, useEffect, useRef, useMemo } from '@wordpress/element';
import { useSelect } from '@wordpress/data';
import { store as coreStore } from '@wordpress/core-data';
import apiFetch from '@wordpress/api-fetch';
import { useDebouncedValue } from './use-debounced-value';
import './editor.scss';

function SortablePinnedList( { items, onReorder, onRemove, onMoveUp, onMoveDown } ) {
	const [ dragIndex, setDragIndex ] = useState( null );
	const [ dropIndex, setDropIndex ] = useState( null );
	const listRef = useRef( null );
	const dragStartY = useRef( 0 );

	const handlePointerDown = ( e, index ) => {
		// Only start drag from the handle.
		if ( ! e.target.closest( '.wp-pin-query-pinned-item__drag-handle' ) ) {
			return;
		}
		e.preventDefault();
		e.stopPropagation();
		setDragIndex( index );
		setDropIndex( index );
		dragStartY.current = e.clientY;
		e.target.setPointerCapture( e.pointerId );
	};

	const handlePointerMove = ( e ) => {
		if ( dragIndex === null || ! listRef.current ) {
			return;
		}
		e.preventDefault();
		e.stopPropagation();

		// Determine which item we're hovering over based on element positions.
		const children = Array.from( listRef.current.children );
		for ( let i = 0; i < children.length; i++ ) {
			const rect = children[ i ].getBoundingClientRect();
			const midY = rect.top + rect.height / 2;
			if ( e.clientY < midY ) {
				setDropIndex( i );
				return;
			}
		}
		setDropIndex( children.length - 1 );
	};

	const handlePointerUp = ( e ) => {
		if ( dragIndex === null ) {
			return;
		}
		e.stopPropagation();
		if ( dropIndex !== null && dragIndex !== dropIndex ) {
			onReorder( dragIndex, dropIndex );
		}
		setDragIndex( null );
		setDropIndex( null );
	};

	return (
		<div
			ref={ listRef }
			className="wp-pin-query-pinned-list"
			onPointerMove={ handlePointerMove }
			onPointerUp={ handlePointerUp }
		>
			{ items.map( ( item, index ) => {
				let className = 'wp-pin-query-pinned-item';
				if ( dragIndex !== null && index === dragIndex ) {
					className += ' is-dragging';
				}
				if ( dragIndex !== null && index === dropIndex && index !== dragIndex ) {
					className += dragIndex > dropIndex ? ' is-drop-above' : ' is-drop-below';
				}

				return (
					<div
						key={ item.id }
						className={ className }
						onPointerDown={ ( e ) => handlePointerDown( e, index ) }
					>
						<span
							className="wp-pin-query-pinned-item__drag-handle"
							title={ __( 'Drag to reorder', 'wp-pin-query-block' ) }
						>
							⠿
						</span>
						{ item.thumbnail && (
							<img
								className="wp-pin-query-pinned-item__thumbnail"
								src={ item.thumbnail }
								alt=""
							/>
						) }
						<span className="wp-pin-query-pinned-item__title">
							{ item.title }
						</span>
						<span className="wp-pin-query-pinned-item__type">
							{ item.typeLabel }
						</span>
						<div className="wp-pin-query-pinned-item__actions">
							<Button
								icon="arrow-up-alt2"
								label={ __( 'Move up', 'wp-pin-query-block' ) }
								onClick={ () => onMoveUp( index ) }
								disabled={ index === 0 }
								size="small"
							/>
							<Button
								icon="arrow-down-alt2"
								label={ __( 'Move down', 'wp-pin-query-block' ) }
								onClick={ () => onMoveDown( index ) }
								disabled={ items.length - 1 === index }
								size="small"
							/>
							<Button
								icon="no-alt"
								label={ __( 'Remove', 'wp-pin-query-block' ) }
								onClick={ () => onRemove( index ) }
								isDestructive
								size="small"
							/>
						</div>
					</div>
				);
			} ) }
		</div>
	);
}

export default function Edit( { attributes, setAttributes } ) {
	const { pinnedPosts, columns } = attributes;
	const [ searchQuery, setSearchQuery ] = useState( '' );
	const [ searchResults, setSearchResults ] = useState( [] );
	const [ isSearching, setIsSearching ] = useState( false );
	const debouncedSearch = useDebouncedValue( searchQuery, 300 );

	// Resolve pinned posts to get their current titles and thumbnails.
	const resolvedPinned = useSelect(
		( select ) => {
			if ( ! pinnedPosts.length ) {
				return [];
			}
			const { getEntityRecord } = select( coreStore );
			return pinnedPosts.map( ( pin ) => {
				const postType = pin.type === 'tribe_events' ? 'tribe_events' : 'post';
				const record = getEntityRecord( 'postType', postType, pin.id );
				if ( ! record ) {
					return { ...pin, title: `#${ pin.id }`, thumbnail: '' };
				}
				const thumbnail = record.featured_media
					? select( coreStore ).getMedia( record.featured_media, { context: 'view' } )
					: null;
				return {
					...pin,
					title: record.title?.rendered || record.title?.raw || `#${ pin.id }`,
					thumbnail: thumbnail?.media_details?.sizes?.thumbnail?.source_url || '',
				};
			} );
		},
		[ pinnedPosts ]
	);

	// Search when debounced value changes.
	useEffect( () => {
		if ( ! debouncedSearch || debouncedSearch.length < 2 ) {
			setSearchResults( [] );
			return;
		}

		setIsSearching( true );
		apiFetch( {
			path: `/pin-query/v1/search?search=${ encodeURIComponent( debouncedSearch ) }&per_page=10`,
		} )
			.then( ( results ) => {
				setSearchResults( results );
			} )
			.catch( () => {
				setSearchResults( [] );
			} )
			.finally( () => {
				setIsSearching( false );
			} );
	}, [ debouncedSearch ] );

	const pinnedIds = pinnedPosts.map( ( p ) => p.id );

	const addPin = useCallback(
		( item ) => {
			setAttributes( {
				pinnedPosts: [
					...pinnedPosts,
					{ id: item.id, type: item.type, title: item.title, typeLabel: item.typeLabel, thumbnail: item.thumbnail },
				],
			} );
		},
		[ pinnedPosts, setAttributes ]
	);

	const removePin = useCallback(
		( index ) => {
			const next = [ ...pinnedPosts ];
			next.splice( index, 1 );
			setAttributes( { pinnedPosts: next } );
		},
		[ pinnedPosts, setAttributes ]
	);

	const movePin = useCallback(
		( fromIndex, toIndex ) => {
			if ( toIndex < 0 || toIndex >= pinnedPosts.length ) {
				return;
			}
			const next = [ ...pinnedPosts ];
			const [ moved ] = next.splice( fromIndex, 1 );
			next.splice( toIndex, 0, moved );
			setAttributes( { pinnedPosts: next } );
		},
		[ pinnedPosts, setAttributes ]
	);

	const blockProps = useBlockProps();

	return (
		<div { ...blockProps }>
			<InspectorControls>
				<PanelBody title={ __( 'Display Settings', 'wp-pin-query-block' ) }>
					<RangeControl
						label={ __( 'Columns', 'wp-pin-query-block' ) }
						value={ columns }
						onChange={ ( value ) => setAttributes( { columns: value } ) }
						min={ 1 }
						max={ 4 }
					/>
				</PanelBody>
			</InspectorControls>

			<div className="wp-pin-query-editor">
				<div className="wp-pin-query-editor__search">
					<TextControl
						__nextHasNoMarginBottom
						label={ __( 'Search posts and events', 'wp-pin-query-block' ) }
						value={ searchQuery }
						onChange={ setSearchQuery }
						placeholder={ __( 'Type to search…', 'wp-pin-query-block' ) }
					/>
					{ isSearching && <Spinner /> }

					{ searchResults.length > 0 && (
						<div className="wp-pin-query-editor__results">
							{ searchResults.map( ( item ) => {
								const isPinned = pinnedIds.includes( item.id );
								return (
									<div key={ item.id } className="wp-pin-query-editor__result-item">
										{ item.thumbnail && (
											<img
												className="wp-pin-query-editor__result-thumb"
												src={ item.thumbnail }
												alt=""
											/>
										) }
										<span className="wp-pin-query-editor__result-title">
											{ item.title }
										</span>
										<span className="wp-pin-query-editor__result-type">
											{ item.typeLabel }
										</span>
										<Button
											variant="secondary"
											size="small"
											onClick={ () => addPin( item ) }
											disabled={ isPinned }
										>
											{ isPinned
												? __( 'Pinned', 'wp-pin-query-block' )
												: __( 'Pin', 'wp-pin-query-block' ) }
										</Button>
									</div>
								);
							} ) }
						</div>
					) }
				</div>

				{ resolvedPinned.length > 0 && (
					<div className="wp-pin-query-editor__pinned">
						<h4>{ __( 'Pinned Items', 'wp-pin-query-block' ) }</h4>
						<SortablePinnedList
							items={ resolvedPinned }
							onReorder={ movePin }
							onRemove={ removePin }
							onMoveUp={ ( i ) => movePin( i, i - 1 ) }
							onMoveDown={ ( i ) => movePin( i, i + 1 ) }
						/>
					</div>
				) }

				{ resolvedPinned.length === 0 && ! searchQuery && (
					<p className="wp-pin-query-editor__placeholder">
						{ __( 'Search for posts and events to pin them as featured content.', 'wp-pin-query-block' ) }
					</p>
				) }
			</div>
		</div>
	);
}
