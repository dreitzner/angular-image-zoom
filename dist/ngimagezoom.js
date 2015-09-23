/**
 * @license AngularImage Zoom
 * License: MIT
 */
(function(window, document, angular) {
'use strict';
angular.module('imageZoom', []);

angular.module('imageZoom').run(['$templateCache', function($templateCache) {
    $templateCache.put('zoom-control.html','<div class=\"zoom-control__clip\">\r\n    <img ng-src=\"{{imageSrc}}\"/>\r\n    <div class=\"mark\"></div>\r\n</div>\r\n');

    $templateCache.put('zoom-image-container.html','<div class=\"zoom-image-container__clip\">\r\n    <img ng-src=\"{{imageSrc}}\"/>\r\n</div>\r\n');
}]);

angular
    .module('imageZoom')
    .directive('zoomControl', ['$rootScope', function ($rootScope) {

        function link(scope, element, attrs, ctrl) {

            var $ = angular.element,
                clip = $(element[0].querySelector('.zoom-control__clip')),
                image = clip.find('img'),
                mark = $(clip[0].querySelector('.mark')),
                origWidth = image[0].naturalWidth,
                origHeight = image[0].naturalHeight,
                markBoundingRect = mark[0].getBoundingClientRect();



            scope.imageSrc = ctrl.getImageUrl();
            scope.imageContainerElem = ctrl.getImageContainerElem();
            scope.imageContainerElemZoomed = scope.imageContainerElem[0].querySelector('.zoom-image-container__clip');


            scope.$on('zoom-imagesrc:changed', function(evt, newSrc) {
                scope.imageSrc = newSrc;
            });

            if (!origWidth || !origHeight) {
                image[0].addEventListener('load', onImageLoaded);
            }

            function onImageLoaded(evt) {
                console.log('loaded', evt.currentTarget);

                origWidth = image[0].naturalWidth;
                origHeight = image[0].naturalHeight;

                ctrl.setOrigDimensions(origWidth, origHeight);

                if(scope.imageContainerElem && scope.imageContainerElem.length > 0) {

                    if(scope.imageContainerElemZoomed) {
                        initMark();
                    } else {
                        scope.$on('zoom-imagecontainer:found', initMark());
                    }

                }
                $rootScope.$broadcast('zoom-image:loaded');


            }

            //scope.level =  isNaN(lvlCandidate) ? 1 : lvlCandidate;
            function initMark() {
                var imageContainerHeight;
                scope.markWidth = scope.imageContainerElemZoomed.clientWidth / origWidth * clip[0].clientWidth;

                //console.log('width', scope.imageContainerElemZoomed.clientWidth, origHeight / origWidth);
                imageContainerHeight = scope.imageContainerElemZoomed.clientWidth * (origHeight/origWidth);

                scope.markHeight = imageContainerHeight / origHeight * clip[0].clientHeight;

                mark.css('height', scope.markHeight + 'px')
                    .css('width', scope.markWidth + 'px');


                //moveMarkRel({x:0.5, y:0.5});
            }

            function onMouseMove(evt) {
                moveMarkRel(calculateOffsetRelative(evt));
            }

            clip.on('mouseenter', function (evt) {
                //console.log('enter');
                moveMarkRel(calculateOffsetRelative(evt));
                clip.on('mousemove', onMouseMove);
            });

            clip.on('mouseleave', function (evt) {
                //console.log('leave');
                clip.off('mousemove', onMouseMove);
            });

            function moveMarkRel(offsetRel) {

                var dx = scope.markWidth,
                    dy = scope.markHeight,
                    x = offsetRel.x * clip[0].clientWidth - dx *.5,
                    y = offsetRel.y * clip[0].clientHeight - dy * .5,
                    verti = clip[0].clientHeight / scope.markHeight, //1.9;
                    hori =  clip[0].clientWidth / scope.markWidth;//2;

                //console.log('x', offsetRel.x, clip[0].clientWidth, dx *.5);
                mark
                    .css('left', x + 'px')
                    .css('top',  y + 'px');

                $rootScope.$broadcast('mark:moved', [{x:offsetRel.x*(1+hori)-(hori *.5), y:offsetRel.y*(1+verti)-(verti *.5)}]);

            }

            function calculateOffsetRelative(mouseEvent) {

                markBoundingRect = markBoundingRect || mouseEvent.currentTarget.getBoundingClientRect();
                //console.log('offseet',  mouseEvent.currentTarget, mouseEvent.clientX, markBoundingRect.left, mouseEvent.currentTarget.clientWidth);
                return {
                    x: (mouseEvent.clientX - markBoundingRect.left) / (mouseEvent.currentTarget.clientWidth),
                    y: (mouseEvent.clientY - markBoundingRect.top) / mouseEvent.currentTarget.clientHeight
                }
            }
        }

        return {
            restrict: 'A',
            require: '^zoom',
            scope: {},
            templateUrl: 'zoom-control.html',
            link: link
        };
    }]);

angular
    .module('imageZoom')
    .directive('zoomImageContainer', function () {

        function link(scope, element, attrs, ctrl) {

            var $ = angular.element,
                zoomed = $(element[0].querySelector('.zoom-image-container__clip')),
                zoomedImg = zoomed.find('img');

            scope.imageSrc = ctrl.getImageUrl();

            scope.$on('zoom-image:loaded', function(event) {
                var imageContainerHeight;

                scope.origDimensions = ctrl.getOrigDimensions();
                imageContainerHeight = zoomed[0].clientWidth * (scope.origDimensions.height/scope.origDimensions.width);
                //console.log('imageContainerHeight', imageContainerHeight);

                zoomed
                    .css('height', imageContainerHeight + 'px');

            });

            scope.$on('mark:moved', function (event, data) {
                updateZoomedRel.apply(this, data);
            });

            scope.$on('zoom-imagesrc:changed', function(evt, newSrc) {
                scope.imageSrc = newSrc;
            });

            function updateZoomedRel(offsetRel) {
                scope.$apply(function () {
                    zoomedImg
                        .css('left', ((zoomed[0].clientWidth - scope.origDimensions.width)  * (offsetRel.x )) + 'px')
                        .css('top',  ((zoomed[0].clientHeight - scope.origDimensions.height) * (offsetRel.y )) + 'px');
                });
            }

            attrs.$observe('ngSrc', function (data) {
                //console.log('update src', data, attrs.ngSrc);
                scope.imageSrc = attrs.ngSrc;
            }, true);

            attrs.$observe('level', function (data) {
                //console.log('update level', data);
                scope.level = data;
            }, true);
        }

        return {
            restrict: 'A',
            require: '^zoom',
            scope: {},
            templateUrl: 'zoom-image-container.html',
            link: link
        };
    });

angular
    .module('imageZoom')
    .directive('zoom', ['$rootScope', function ($rootScope) {


        function link(scope, element, attrs) {
            var $ = angular.element;
            scope.controlElem = $(element[0].querySelector('[zoom-control]'));
            scope.imageContainerElem = $(element[0].querySelector('[zoom-image-container]'));

            scope.$broadcast('zoom-control:found', scope.controlElem);
            scope.$broadcast('zoom-imagecontainer:found', scope.imageContainerElem);

            //console.log('zoomImageContainerElem', scope.imageContainerElem);

            attrs.$observe('zoomImagesrc', function (data) {
                //console.log('update src', data, attrs.zoom);
                scope.imageSrc = attrs.zoomImagesrc;
                $rootScope.$broadcast('zoom-imagesrc:changed', attrs.zoomImagesrc);
            }, true);

            attrs.$observe('level', function (data) {
                //console.log('update level', data);
                scope.level = data;
            }, true);

        }

        return {
            restrict: 'EA',
            scope: {
                imageSrc: '@zoomImagesrc'
            },
            link: link,
            controller: ['$scope', function($scope) {


                this.getImageUrl = function() {
                    return $scope.imageSrc;
                };

                this.getControlElem = function() {
                    return $scope.controlElem;
                };

                this.getImageContainerElem = function() {
                    return $scope.imageContainerElem;
                };

                this.setOrigDimensions = function(origWidth, origHeight) {
                    $scope.origWidth = origWidth;
                    $scope.origHeight = origHeight;
                };

                this.getOrigDimensions = function() {
                    return {
                        width: $scope.origWidth,
                        height: $scope.origHeight
                    };
                };
            }]
        };
    }]);

})(window, document, window.angular);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1vZHVsZS5qcyIsInRlbXBsYXRlcy5qcyIsImRpcmVjdGl2ZXMvem9vbS1jb250cm9sLmpzIiwiZGlyZWN0aXZlcy96b29tLWltYWdlLWNvbnRhaW5lci5qcyIsImRpcmVjdGl2ZXMvem9vbS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN4SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDM0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6Im5naW1hZ2V6b29tLmpzIiwic291cmNlc0NvbnRlbnQiOlsiYW5ndWxhci5tb2R1bGUoJ2ltYWdlWm9vbScsIFtdKTtcbiIsImFuZ3VsYXIubW9kdWxlKCdpbWFnZVpvb20nKS5ydW4oWyckdGVtcGxhdGVDYWNoZScsIGZ1bmN0aW9uKCR0ZW1wbGF0ZUNhY2hlKSB7XG4gICAgJHRlbXBsYXRlQ2FjaGUucHV0KCd6b29tLWNvbnRyb2wuaHRtbCcsJzxkaXYgY2xhc3M9XFxcInpvb20tY29udHJvbF9fY2xpcFxcXCI+XFxyXFxuICAgIDxpbWcgbmctc3JjPVxcXCJ7e2ltYWdlU3JjfX1cXFwiLz5cXHJcXG4gICAgPGRpdiBjbGFzcz1cXFwibWFya1xcXCI+PC9kaXY+XFxyXFxuPC9kaXY+XFxyXFxuJyk7XG5cbiAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ3pvb20taW1hZ2UtY29udGFpbmVyLmh0bWwnLCc8ZGl2IGNsYXNzPVxcXCJ6b29tLWltYWdlLWNvbnRhaW5lcl9fY2xpcFxcXCI+XFxyXFxuICAgIDxpbWcgbmctc3JjPVxcXCJ7e2ltYWdlU3JjfX1cXFwiLz5cXHJcXG48L2Rpdj5cXHJcXG4nKTtcbn1dKTtcbiIsImFuZ3VsYXJcbiAgICAubW9kdWxlKCdpbWFnZVpvb20nKVxuICAgIC5kaXJlY3RpdmUoJ3pvb21Db250cm9sJywgWyckcm9vdFNjb3BlJywgZnVuY3Rpb24gKCRyb290U2NvcGUpIHtcblxuICAgICAgICBmdW5jdGlvbiBsaW5rKHNjb3BlLCBlbGVtZW50LCBhdHRycywgY3RybCkge1xuXG4gICAgICAgICAgICB2YXIgJCA9IGFuZ3VsYXIuZWxlbWVudCxcbiAgICAgICAgICAgICAgICBjbGlwID0gJChlbGVtZW50WzBdLnF1ZXJ5U2VsZWN0b3IoJy56b29tLWNvbnRyb2xfX2NsaXAnKSksXG4gICAgICAgICAgICAgICAgaW1hZ2UgPSBjbGlwLmZpbmQoJ2ltZycpLFxuICAgICAgICAgICAgICAgIG1hcmsgPSAkKGNsaXBbMF0ucXVlcnlTZWxlY3RvcignLm1hcmsnKSksXG4gICAgICAgICAgICAgICAgb3JpZ1dpZHRoID0gaW1hZ2VbMF0ubmF0dXJhbFdpZHRoLFxuICAgICAgICAgICAgICAgIG9yaWdIZWlnaHQgPSBpbWFnZVswXS5uYXR1cmFsSGVpZ2h0LFxuICAgICAgICAgICAgICAgIG1hcmtCb3VuZGluZ1JlY3QgPSBtYXJrWzBdLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuXG5cblxuICAgICAgICAgICAgc2NvcGUuaW1hZ2VTcmMgPSBjdHJsLmdldEltYWdlVXJsKCk7XG4gICAgICAgICAgICBzY29wZS5pbWFnZUNvbnRhaW5lckVsZW0gPSBjdHJsLmdldEltYWdlQ29udGFpbmVyRWxlbSgpO1xuICAgICAgICAgICAgc2NvcGUuaW1hZ2VDb250YWluZXJFbGVtWm9vbWVkID0gc2NvcGUuaW1hZ2VDb250YWluZXJFbGVtWzBdLnF1ZXJ5U2VsZWN0b3IoJy56b29tLWltYWdlLWNvbnRhaW5lcl9fY2xpcCcpO1xuXG5cbiAgICAgICAgICAgIHNjb3BlLiRvbignem9vbS1pbWFnZXNyYzpjaGFuZ2VkJywgZnVuY3Rpb24oZXZ0LCBuZXdTcmMpIHtcbiAgICAgICAgICAgICAgICBzY29wZS5pbWFnZVNyYyA9IG5ld1NyYztcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBpZiAoIW9yaWdXaWR0aCB8fCAhb3JpZ0hlaWdodCkge1xuICAgICAgICAgICAgICAgIGltYWdlWzBdLmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWQnLCBvbkltYWdlTG9hZGVkKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZnVuY3Rpb24gb25JbWFnZUxvYWRlZChldnQpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnbG9hZGVkJywgZXZ0LmN1cnJlbnRUYXJnZXQpO1xuXG4gICAgICAgICAgICAgICAgb3JpZ1dpZHRoID0gaW1hZ2VbMF0ubmF0dXJhbFdpZHRoO1xuICAgICAgICAgICAgICAgIG9yaWdIZWlnaHQgPSBpbWFnZVswXS5uYXR1cmFsSGVpZ2h0O1xuXG4gICAgICAgICAgICAgICAgY3RybC5zZXRPcmlnRGltZW5zaW9ucyhvcmlnV2lkdGgsIG9yaWdIZWlnaHQpO1xuXG4gICAgICAgICAgICAgICAgaWYoc2NvcGUuaW1hZ2VDb250YWluZXJFbGVtICYmIHNjb3BlLmltYWdlQ29udGFpbmVyRWxlbS5sZW5ndGggPiAwKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYoc2NvcGUuaW1hZ2VDb250YWluZXJFbGVtWm9vbWVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpbml0TWFyaygpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUuJG9uKCd6b29tLWltYWdlY29udGFpbmVyOmZvdW5kJywgaW5pdE1hcmsoKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoJ3pvb20taW1hZ2U6bG9hZGVkJyk7XG5cblxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvL3Njb3BlLmxldmVsID0gIGlzTmFOKGx2bENhbmRpZGF0ZSkgPyAxIDogbHZsQ2FuZGlkYXRlO1xuICAgICAgICAgICAgZnVuY3Rpb24gaW5pdE1hcmsoKSB7XG4gICAgICAgICAgICAgICAgdmFyIGltYWdlQ29udGFpbmVySGVpZ2h0O1xuICAgICAgICAgICAgICAgIHNjb3BlLm1hcmtXaWR0aCA9IHNjb3BlLmltYWdlQ29udGFpbmVyRWxlbVpvb21lZC5jbGllbnRXaWR0aCAvIG9yaWdXaWR0aCAqIGNsaXBbMF0uY2xpZW50V2lkdGg7XG5cbiAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKCd3aWR0aCcsIHNjb3BlLmltYWdlQ29udGFpbmVyRWxlbVpvb21lZC5jbGllbnRXaWR0aCwgb3JpZ0hlaWdodCAvIG9yaWdXaWR0aCk7XG4gICAgICAgICAgICAgICAgaW1hZ2VDb250YWluZXJIZWlnaHQgPSBzY29wZS5pbWFnZUNvbnRhaW5lckVsZW1ab29tZWQuY2xpZW50V2lkdGggKiAob3JpZ0hlaWdodC9vcmlnV2lkdGgpO1xuXG4gICAgICAgICAgICAgICAgc2NvcGUubWFya0hlaWdodCA9IGltYWdlQ29udGFpbmVySGVpZ2h0IC8gb3JpZ0hlaWdodCAqIGNsaXBbMF0uY2xpZW50SGVpZ2h0O1xuXG4gICAgICAgICAgICAgICAgbWFyay5jc3MoJ2hlaWdodCcsIHNjb3BlLm1hcmtIZWlnaHQgKyAncHgnKVxuICAgICAgICAgICAgICAgICAgICAuY3NzKCd3aWR0aCcsIHNjb3BlLm1hcmtXaWR0aCArICdweCcpO1xuXG5cbiAgICAgICAgICAgICAgICAvL21vdmVNYXJrUmVsKHt4OjAuNSwgeTowLjV9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZnVuY3Rpb24gb25Nb3VzZU1vdmUoZXZ0KSB7XG4gICAgICAgICAgICAgICAgbW92ZU1hcmtSZWwoY2FsY3VsYXRlT2Zmc2V0UmVsYXRpdmUoZXZ0KSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNsaXAub24oJ21vdXNlZW50ZXInLCBmdW5jdGlvbiAoZXZ0KSB7XG4gICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZygnZW50ZXInKTtcbiAgICAgICAgICAgICAgICBtb3ZlTWFya1JlbChjYWxjdWxhdGVPZmZzZXRSZWxhdGl2ZShldnQpKTtcbiAgICAgICAgICAgICAgICBjbGlwLm9uKCdtb3VzZW1vdmUnLCBvbk1vdXNlTW92ZSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgY2xpcC5vbignbW91c2VsZWF2ZScsIGZ1bmN0aW9uIChldnQpIHtcbiAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKCdsZWF2ZScpO1xuICAgICAgICAgICAgICAgIGNsaXAub2ZmKCdtb3VzZW1vdmUnLCBvbk1vdXNlTW92ZSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgZnVuY3Rpb24gbW92ZU1hcmtSZWwob2Zmc2V0UmVsKSB7XG5cbiAgICAgICAgICAgICAgICB2YXIgZHggPSBzY29wZS5tYXJrV2lkdGgsXG4gICAgICAgICAgICAgICAgICAgIGR5ID0gc2NvcGUubWFya0hlaWdodCxcbiAgICAgICAgICAgICAgICAgICAgeCA9IG9mZnNldFJlbC54ICogY2xpcFswXS5jbGllbnRXaWR0aCAtIGR4ICouNSxcbiAgICAgICAgICAgICAgICAgICAgeSA9IG9mZnNldFJlbC55ICogY2xpcFswXS5jbGllbnRIZWlnaHQgLSBkeSAqIC41LFxuICAgICAgICAgICAgICAgICAgICB2ZXJ0aSA9IGNsaXBbMF0uY2xpZW50SGVpZ2h0IC8gc2NvcGUubWFya0hlaWdodCwgLy8xLjk7XG4gICAgICAgICAgICAgICAgICAgIGhvcmkgPSAgY2xpcFswXS5jbGllbnRXaWR0aCAvIHNjb3BlLm1hcmtXaWR0aDsvLzI7XG5cbiAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKCd4Jywgb2Zmc2V0UmVsLngsIGNsaXBbMF0uY2xpZW50V2lkdGgsIGR4ICouNSk7XG4gICAgICAgICAgICAgICAgbWFya1xuICAgICAgICAgICAgICAgICAgICAuY3NzKCdsZWZ0JywgeCArICdweCcpXG4gICAgICAgICAgICAgICAgICAgIC5jc3MoJ3RvcCcsICB5ICsgJ3B4Jyk7XG5cbiAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoJ21hcms6bW92ZWQnLCBbe3g6b2Zmc2V0UmVsLngqKDEraG9yaSktKGhvcmkgKi41KSwgeTpvZmZzZXRSZWwueSooMSt2ZXJ0aSktKHZlcnRpICouNSl9XSk7XG5cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZnVuY3Rpb24gY2FsY3VsYXRlT2Zmc2V0UmVsYXRpdmUobW91c2VFdmVudCkge1xuXG4gICAgICAgICAgICAgICAgbWFya0JvdW5kaW5nUmVjdCA9IG1hcmtCb3VuZGluZ1JlY3QgfHwgbW91c2VFdmVudC5jdXJyZW50VGFyZ2V0LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2coJ29mZnNlZXQnLCAgbW91c2VFdmVudC5jdXJyZW50VGFyZ2V0LCBtb3VzZUV2ZW50LmNsaWVudFgsIG1hcmtCb3VuZGluZ1JlY3QubGVmdCwgbW91c2VFdmVudC5jdXJyZW50VGFyZ2V0LmNsaWVudFdpZHRoKTtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICB4OiAobW91c2VFdmVudC5jbGllbnRYIC0gbWFya0JvdW5kaW5nUmVjdC5sZWZ0KSAvIChtb3VzZUV2ZW50LmN1cnJlbnRUYXJnZXQuY2xpZW50V2lkdGgpLFxuICAgICAgICAgICAgICAgICAgICB5OiAobW91c2VFdmVudC5jbGllbnRZIC0gbWFya0JvdW5kaW5nUmVjdC50b3ApIC8gbW91c2VFdmVudC5jdXJyZW50VGFyZ2V0LmNsaWVudEhlaWdodFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByZXN0cmljdDogJ0EnLFxuICAgICAgICAgICAgcmVxdWlyZTogJ156b29tJyxcbiAgICAgICAgICAgIHNjb3BlOiB7fSxcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnem9vbS1jb250cm9sLmh0bWwnLFxuICAgICAgICAgICAgbGluazogbGlua1xuICAgICAgICB9O1xuICAgIH1dKTtcbiIsImFuZ3VsYXJcbiAgICAubW9kdWxlKCdpbWFnZVpvb20nKVxuICAgIC5kaXJlY3RpdmUoJ3pvb21JbWFnZUNvbnRhaW5lcicsIGZ1bmN0aW9uICgpIHtcblxuICAgICAgICBmdW5jdGlvbiBsaW5rKHNjb3BlLCBlbGVtZW50LCBhdHRycywgY3RybCkge1xuXG4gICAgICAgICAgICB2YXIgJCA9IGFuZ3VsYXIuZWxlbWVudCxcbiAgICAgICAgICAgICAgICB6b29tZWQgPSAkKGVsZW1lbnRbMF0ucXVlcnlTZWxlY3RvcignLnpvb20taW1hZ2UtY29udGFpbmVyX19jbGlwJykpLFxuICAgICAgICAgICAgICAgIHpvb21lZEltZyA9IHpvb21lZC5maW5kKCdpbWcnKTtcblxuICAgICAgICAgICAgc2NvcGUuaW1hZ2VTcmMgPSBjdHJsLmdldEltYWdlVXJsKCk7XG5cbiAgICAgICAgICAgIHNjb3BlLiRvbignem9vbS1pbWFnZTpsb2FkZWQnLCBmdW5jdGlvbihldmVudCkge1xuICAgICAgICAgICAgICAgIHZhciBpbWFnZUNvbnRhaW5lckhlaWdodDtcblxuICAgICAgICAgICAgICAgIHNjb3BlLm9yaWdEaW1lbnNpb25zID0gY3RybC5nZXRPcmlnRGltZW5zaW9ucygpO1xuICAgICAgICAgICAgICAgIGltYWdlQ29udGFpbmVySGVpZ2h0ID0gem9vbWVkWzBdLmNsaWVudFdpZHRoICogKHNjb3BlLm9yaWdEaW1lbnNpb25zLmhlaWdodC9zY29wZS5vcmlnRGltZW5zaW9ucy53aWR0aCk7XG4gICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZygnaW1hZ2VDb250YWluZXJIZWlnaHQnLCBpbWFnZUNvbnRhaW5lckhlaWdodCk7XG5cbiAgICAgICAgICAgICAgICB6b29tZWRcbiAgICAgICAgICAgICAgICAgICAgLmNzcygnaGVpZ2h0JywgaW1hZ2VDb250YWluZXJIZWlnaHQgKyAncHgnKTtcblxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHNjb3BlLiRvbignbWFyazptb3ZlZCcsIGZ1bmN0aW9uIChldmVudCwgZGF0YSkge1xuICAgICAgICAgICAgICAgIHVwZGF0ZVpvb21lZFJlbC5hcHBseSh0aGlzLCBkYXRhKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBzY29wZS4kb24oJ3pvb20taW1hZ2VzcmM6Y2hhbmdlZCcsIGZ1bmN0aW9uKGV2dCwgbmV3U3JjKSB7XG4gICAgICAgICAgICAgICAgc2NvcGUuaW1hZ2VTcmMgPSBuZXdTcmM7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgZnVuY3Rpb24gdXBkYXRlWm9vbWVkUmVsKG9mZnNldFJlbCkge1xuICAgICAgICAgICAgICAgIHNjb3BlLiRhcHBseShmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHpvb21lZEltZ1xuICAgICAgICAgICAgICAgICAgICAgICAgLmNzcygnbGVmdCcsICgoem9vbWVkWzBdLmNsaWVudFdpZHRoIC0gc2NvcGUub3JpZ0RpbWVuc2lvbnMud2lkdGgpICAqIChvZmZzZXRSZWwueCApKSArICdweCcpXG4gICAgICAgICAgICAgICAgICAgICAgICAuY3NzKCd0b3AnLCAgKCh6b29tZWRbMF0uY2xpZW50SGVpZ2h0IC0gc2NvcGUub3JpZ0RpbWVuc2lvbnMuaGVpZ2h0KSAqIChvZmZzZXRSZWwueSApKSArICdweCcpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBhdHRycy4kb2JzZXJ2ZSgnbmdTcmMnLCBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2coJ3VwZGF0ZSBzcmMnLCBkYXRhLCBhdHRycy5uZ1NyYyk7XG4gICAgICAgICAgICAgICAgc2NvcGUuaW1hZ2VTcmMgPSBhdHRycy5uZ1NyYztcbiAgICAgICAgICAgIH0sIHRydWUpO1xuXG4gICAgICAgICAgICBhdHRycy4kb2JzZXJ2ZSgnbGV2ZWwnLCBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2coJ3VwZGF0ZSBsZXZlbCcsIGRhdGEpO1xuICAgICAgICAgICAgICAgIHNjb3BlLmxldmVsID0gZGF0YTtcbiAgICAgICAgICAgIH0sIHRydWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnQScsXG4gICAgICAgICAgICByZXF1aXJlOiAnXnpvb20nLFxuICAgICAgICAgICAgc2NvcGU6IHt9LFxuICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICd6b29tLWltYWdlLWNvbnRhaW5lci5odG1sJyxcbiAgICAgICAgICAgIGxpbms6IGxpbmtcbiAgICAgICAgfTtcbiAgICB9KTtcbiIsImFuZ3VsYXJcbiAgICAubW9kdWxlKCdpbWFnZVpvb20nKVxuICAgIC5kaXJlY3RpdmUoJ3pvb20nLCBbJyRyb290U2NvcGUnLCBmdW5jdGlvbiAoJHJvb3RTY29wZSkge1xuXG5cbiAgICAgICAgZnVuY3Rpb24gbGluayhzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcbiAgICAgICAgICAgIHZhciAkID0gYW5ndWxhci5lbGVtZW50O1xuICAgICAgICAgICAgc2NvcGUuY29udHJvbEVsZW0gPSAkKGVsZW1lbnRbMF0ucXVlcnlTZWxlY3RvcignW3pvb20tY29udHJvbF0nKSk7XG4gICAgICAgICAgICBzY29wZS5pbWFnZUNvbnRhaW5lckVsZW0gPSAkKGVsZW1lbnRbMF0ucXVlcnlTZWxlY3RvcignW3pvb20taW1hZ2UtY29udGFpbmVyXScpKTtcblxuICAgICAgICAgICAgc2NvcGUuJGJyb2FkY2FzdCgnem9vbS1jb250cm9sOmZvdW5kJywgc2NvcGUuY29udHJvbEVsZW0pO1xuICAgICAgICAgICAgc2NvcGUuJGJyb2FkY2FzdCgnem9vbS1pbWFnZWNvbnRhaW5lcjpmb3VuZCcsIHNjb3BlLmltYWdlQ29udGFpbmVyRWxlbSk7XG5cbiAgICAgICAgICAgIC8vY29uc29sZS5sb2coJ3pvb21JbWFnZUNvbnRhaW5lckVsZW0nLCBzY29wZS5pbWFnZUNvbnRhaW5lckVsZW0pO1xuXG4gICAgICAgICAgICBhdHRycy4kb2JzZXJ2ZSgnem9vbUltYWdlc3JjJywgZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKCd1cGRhdGUgc3JjJywgZGF0YSwgYXR0cnMuem9vbSk7XG4gICAgICAgICAgICAgICAgc2NvcGUuaW1hZ2VTcmMgPSBhdHRycy56b29tSW1hZ2VzcmM7XG4gICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KCd6b29tLWltYWdlc3JjOmNoYW5nZWQnLCBhdHRycy56b29tSW1hZ2VzcmMpO1xuICAgICAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgICAgICAgIGF0dHJzLiRvYnNlcnZlKCdsZXZlbCcsIGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZygndXBkYXRlIGxldmVsJywgZGF0YSk7XG4gICAgICAgICAgICAgICAgc2NvcGUubGV2ZWwgPSBkYXRhO1xuICAgICAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByZXN0cmljdDogJ0VBJyxcbiAgICAgICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgICAgICAgaW1hZ2VTcmM6ICdAem9vbUltYWdlc3JjJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGxpbms6IGxpbmssXG4gICAgICAgICAgICBjb250cm9sbGVyOiBbJyRzY29wZScsIGZ1bmN0aW9uKCRzY29wZSkge1xuXG5cbiAgICAgICAgICAgICAgICB0aGlzLmdldEltYWdlVXJsID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAkc2NvcGUuaW1hZ2VTcmM7XG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgIHRoaXMuZ2V0Q29udHJvbEVsZW0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRzY29wZS5jb250cm9sRWxlbTtcbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgdGhpcy5nZXRJbWFnZUNvbnRhaW5lckVsZW0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRzY29wZS5pbWFnZUNvbnRhaW5lckVsZW07XG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgIHRoaXMuc2V0T3JpZ0RpbWVuc2lvbnMgPSBmdW5jdGlvbihvcmlnV2lkdGgsIG9yaWdIZWlnaHQpIHtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLm9yaWdXaWR0aCA9IG9yaWdXaWR0aDtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLm9yaWdIZWlnaHQgPSBvcmlnSGVpZ2h0O1xuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICB0aGlzLmdldE9yaWdEaW1lbnNpb25zID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB3aWR0aDogJHNjb3BlLm9yaWdXaWR0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGhlaWdodDogJHNjb3BlLm9yaWdIZWlnaHRcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfV1cbiAgICAgICAgfTtcbiAgICB9XSk7XG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=