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
import { useState, useCallback, useEffect, useRef } from '@wordpress/element';
import { useSelect } from '@wordpress/data';
import { store as coreStore } from '@wordpress/core-data';
import apiFetch from '@wordpress/api-fetch';
import { useDebouncedValue } from './use-debounced-value';
import './editor.scss';

function PinnedItem( { item, index, total, onRemove, onMoveUp, onMoveDown, onDragStart, onDragOver, onDrop } ) {
	return (
		<div
			className="wp-pin-query-pinned-item"
			draggable
			onDragStart={ ( e ) => onDragStart( e, index ) }
			onDragOver={ ( e ) => onDragOver( e, index ) }
			onDrop={ ( e ) => onDrop( e, index ) }
		>
			<span className="wp-pin-query-pinned-item__drag-handle" title={ __( 'Drag to reorder', 'wp-pin-query-block' ) }>
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
					disabled={ index === total - 1 }
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
}

export default function Edit( { attributes, setAttributes } ) {
	const { pinnedPosts, columns } = attributes;
	const [ searchQuery, setSearchQuery ] = useState( '' );
	const [ searchResults, setSearchResults ] = useState( [] );
	const [ isSearching, setIsSearching ] = useState( false );
	const [ dragIndex, setDragIndex ] = useState( null );
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

	// Drag and drop handlers.
	const handleDragStart = ( e, index ) => {
		setDragIndex( index );
		e.dataTransfer.effectAllowed = 'move';
	};

	const handleDragOver = ( e ) => {
		e.preventDefault();
		e.dataTransfer.dropEffect = 'move';
	};

	const handleDrop = ( e, targetIndex ) => {
		e.preventDefault();
		if ( dragIndex !== null && dragIndex !== targetIndex ) {
			movePin( dragIndex, targetIndex );
		}
		setDragIndex( null );
	};

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
						{ resolvedPinned.map( ( item, index ) => (
							<PinnedItem
								key={ item.id }
								item={ item }
								index={ index }
								total={ resolvedPinned.length }
								onRemove={ removePin }
								onMoveUp={ ( i ) => movePin( i, i - 1 ) }
								onMoveDown={ ( i ) => movePin( i, i + 1 ) }
								onDragStart={ handleDragStart }
								onDragOver={ handleDragOver }
								onDrop={ handleDrop }
							/>
						) ) }
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
